import * as grpc from "@grpc/grpc-js";
import * as protobuf from "protobufjs";
import * as fs from "fs";
import path from "path";

// Proto files live in src/proto/ and are copied to dist/proto/ at build time.
// See src/proto/README.md for why these files exist.
//
// The path differs between compiled output (dist/main/ -> ../proto = dist/proto/)
// and Vitest running source directly (src/ -> proto = src/proto/), so we probe both.
function findProtoDir(): string {
  const candidates = [
    path.join(__dirname, "../proto"),        // production build: dist/main/ → dist/proto/
    path.join(__dirname, "../../src/proto"), // dev: dist/main/ → src/proto/
    path.join(__dirname, "proto"),           // vitest: src/ → src/proto/
  ];
  const found = candidates.find((dir) =>
    fs.existsSync(path.join(dir, "reflection_v1alpha.proto"))
  );
  if (!found) {
    throw new Error(`Proto directory not found. Searched: ${candidates.join(", ")}`);
  }
  return found;
}

const PROTO_DIR = findProtoDir();

// ── Public types ─────────────────────────────────────────────────────────────

export interface GrpcMethod {
  name: string;
  requestType: string;
  responseType: string;
  clientStreaming: boolean;
  serverStreaming: boolean;
}

export interface GrpcService {
  name: string;
  methods: GrpcMethod[];
}

export interface Collection {
  url: string;
  services: GrpcService[];
}

// ── Build a versioned reflection client constructor ───────────────────────────
// Both v1 and v1alpha have identical message structures — only the package
// name (and therefore the RPC path) differs.

function makeReflectionClientCtor(protoFile: string, pkg: string) {
  const root = protobuf.loadSync(path.join(PROTO_DIR, protoFile));
  const ReqType = root.lookupType(`${pkg}.ServerReflectionRequest`);
  const ResType = root.lookupType(`${pkg}.ServerReflectionResponse`);

  return grpc.makeClientConstructor(
    {
      ServerReflectionInfo: {
        path: `/${pkg}.ServerReflection/ServerReflectionInfo`,
        requestStream: true,
        responseStream: true,
        requestSerialize: (req: object) =>
          Buffer.from(ReqType.encode(ReqType.fromObject(req)).finish()),
        requestDeserialize: (buf: Buffer) =>
          ReqType.toObject(ReqType.decode(buf), { defaults: true, arrays: true }),
        responseSerialize: (res: object) =>
          Buffer.from(ResType.encode(ResType.fromObject(res)).finish()),
        responseDeserialize: (buf: Buffer) =>
          ResType.toObject(ResType.decode(buf), { defaults: true, arrays: true }),
      },
    },
    "ServerReflection"
  );
}

// Initialised once at module load time.
// v1alpha is tried first; v1 is the fallback (see discoverServices).
const ClientCtors = {
  v1alpha: makeReflectionClientCtor("reflection_v1alpha.proto", "grpc.reflection.v1alpha"),
  v1:      makeReflectionClientCtor("reflection_v1.proto",      "grpc.reflection.v1"),
};

// ── FileDescriptorProto parsing ───────────────────────────────────────────────

const descriptorRoot = protobuf.loadSync(path.join(PROTO_DIR, "descriptor.proto"));
const FileDescriptorProtoType = descriptorRoot.lookupType("google.protobuf.FileDescriptorProto");

interface RawFileDescriptor {
  name?: string;
  package?: string;
  service?: Array<{
    name?: string;
    method?: Array<{
      name?: string;
      inputType?: string;
      outputType?: string;
      clientStreaming?: boolean;
      serverStreaming?: boolean;
    }>;
  }>;
}

function parseFileDescriptor(bytes: Buffer, seenFiles: Set<string>): GrpcService[] {
  const fd = FileDescriptorProtoType.toObject(
    FileDescriptorProtoType.decode(bytes),
    { defaults: true, arrays: true }
  ) as RawFileDescriptor;

  if (!fd.name || seenFiles.has(fd.name)) return [];
  seenFiles.add(fd.name);

  const pkg = fd.package ?? "";

  return (fd.service ?? []).map((svc) => ({
    name: pkg ? `${pkg}.${svc.name ?? ""}` : (svc.name ?? ""),
    methods: (svc.method ?? []).map((m) => ({
      name: m.name ?? "",
      requestType: (m.inputType ?? "").replace(/^\./, ""),
      responseType: (m.outputType ?? "").replace(/^\./, ""),
      clientStreaming: m.clientStreaming ?? false,
      serverStreaming: m.serverStreaming ?? false,
    })),
  }));
}

// ── Core reflection logic ─────────────────────────────────────────────────────

function runReflection(
  url: string,
  ClientCtor: grpc.ServiceClientConstructor
): Promise<Collection> {
  const client = new ClientCtor(url, grpc.credentials.createInsecure());

  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const call = (client as any).ServerReflectionInfo();
    const allServices: GrpcService[] = [];
    const seenFiles = new Set<string>();
    let pendingSymbols = 0;
    let listDone = false;

    function maybeFinish() {
      if (!listDone || pendingSymbols > 0) return;
      call.end();
      client.close();
      const unique = new Map<string, GrpcService>();
      for (const s of allServices) {
        if (!unique.has(s.name)) unique.set(s.name, s);
      }
      resolve({ url, services: Array.from(unique.values()) });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    call.on("data", (response: any) => {
      if (response.listServicesResponse) {
        const names: string[] = (
          response.listServicesResponse.service as Array<{ name: string }>
        )
          .map((s) => s.name)
          .filter((n: string) => !n.startsWith("grpc.reflection."));

        listDone = true;
        pendingSymbols = names.length;

        if (names.length === 0) {
          maybeFinish();
          return;
        }

        for (const name of names) {
          call.write({ fileContainingSymbol: name });
        }
      } else if (response.fileDescriptorResponse) {
        const protos: Uint8Array[] =
          response.fileDescriptorResponse.fileDescriptorProto ?? [];

        for (const raw of protos) {
          const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
          try {
            allServices.push(...parseFileDescriptor(buf, seenFiles));
          } catch (e) {
            console.error("Failed to decode FileDescriptorProto:", e);
          }
        }
        pendingSymbols--;
        maybeFinish();
      } else if (response.errorResponse) {
        console.warn("Reflection error:", response.errorResponse.errorMessage);
        pendingSymbols--;
        maybeFinish();
      }
    });

    call.on("error", (err: Error) => {
      client.close();
      reject(err);
    });

    call.write({ listServices: "" });
  });
}

// ── Main exported function ────────────────────────────────────────────────────

export async function discoverServices(url: string): Promise<Collection> {
  try {
    return await runReflection(url, ClientCtors.v1alpha);
  } catch (err: unknown) {
    // UNIMPLEMENTED (code 12) means the server doesn't support v1alpha —
    // many modern servers (e.g. grpc-go) only expose the v1 endpoint.
    if ((err as { code?: number }).code === grpc.status.UNIMPLEMENTED) {
      return runReflection(url, ClientCtors.v1);
    }
    throw err;
  }
}
