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
    path.join(__dirname, "../proto"), // compiled: dist/main/ → dist/proto/
    path.join(__dirname, "proto"),    // source:   src/       → src/proto/
  ];
  const found = candidates.find((dir) => fs.existsSync(dir));
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

// ── Module-level singletons (parsed once) ────────────────────────────────────

const reflectionRoot = protobuf.loadSync(
  path.join(PROTO_DIR, "reflection.proto")
);
const ReqType = reflectionRoot.lookupType(
  "grpc.reflection.v1alpha.ServerReflectionRequest"
);
const ResType = reflectionRoot.lookupType(
  "grpc.reflection.v1alpha.ServerReflectionResponse"
);

const descriptorRoot = protobuf.loadSync(
  path.join(PROTO_DIR, "descriptor.proto")
);
const FileDescriptorProtoType = descriptorRoot.lookupType(
  "google.protobuf.FileDescriptorProto"
);

const ReflectionClientCtor = grpc.makeClientConstructor(
  {
    ServerReflectionInfo: {
      path: "/grpc.reflection.v1alpha.ServerReflection/ServerReflectionInfo",
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

// ── FileDescriptorProto parsing ──────────────────────────────────────────────

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

function parseFileDescriptor(
  bytes: Buffer,
  seenFiles: Set<string>
): GrpcService[] {
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

// ── Main exported function ───────────────────────────────────────────────────

export function discoverServices(url: string): Promise<Collection> {
  const client = new ReflectionClientCtor(
    url,
    grpc.credentials.createInsecure()
  );

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
          // Filter out the reflection service itself
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

    // Kick off discovery
    call.write({ listServices: "" });
  });
}
