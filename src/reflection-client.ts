import * as grpc from "@grpc/grpc-js";
import * as protobuf from "protobufjs";
import * as fs from "fs";
import path from "path";

function findProtoDir(): string {
  const candidates = [
    path.join(__dirname, "../../src/proto"), // dev: dist/main/ → src/proto/ (always up to date)
    path.join(__dirname, "../proto"),        // production build: dist/main/ → dist/proto/
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

export interface GrpcField {
  name: string;
  number: number;
  /** e.g. "TYPE_STRING", "TYPE_MESSAGE" */
  type: string;
  /** For TYPE_MESSAGE / TYPE_ENUM: fully-qualified name without leading dot */
  typeName: string;
  repeated: boolean;
}

export interface GrpcMessage {
  /** Fully-qualified, e.g. "helloworld.HelloRequest" */
  name: string;
  fields: GrpcField[];
}

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
  /** All message types discovered — used to generate skeleton JSON */
  messages: GrpcMessage[];
}

// ── Reflection client constructors ───────────────────────────────────────────

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

const ClientCtors = {
  v1alpha: makeReflectionClientCtor("reflection_v1alpha.proto", "grpc.reflection.v1alpha"),
  v1:      makeReflectionClientCtor("reflection_v1.proto",      "grpc.reflection.v1"),
};

// ── FileDescriptorProto parsing ───────────────────────────────────────────────

const descriptorRoot = protobuf.loadSync(path.join(PROTO_DIR, "descriptor.proto"));
const FileDescriptorProtoType = descriptorRoot.lookupType("google.protobuf.FileDescriptorProto");

interface RawField {
  name?: string;
  number?: number;
  label?: string | number;
  type?: string | number;
  typeName?: string;
}

interface RawDescriptor {
  name?: string;
  field?: RawField[];
  nestedType?: RawDescriptor[];
}

interface RawFileDescriptor {
  name?: string;
  package?: string;
  messageType?: RawDescriptor[];
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
): { services: GrpcService[]; messages: GrpcMessage[] } | null {
  const fd = FileDescriptorProtoType.toObject(
    FileDescriptorProtoType.decode(bytes),
    { defaults: true, arrays: true, enums: String }
  ) as RawFileDescriptor;

  if (!fd.name || seenFiles.has(fd.name)) return null;
  seenFiles.add(fd.name);

  const pkg = fd.package ?? "";

  const services: GrpcService[] = (fd.service ?? []).map((svc) => ({
    name: pkg ? `${pkg}.${svc.name ?? ""}` : (svc.name ?? ""),
    methods: (svc.method ?? []).map((m) => ({
      name: m.name ?? "",
      requestType: (m.inputType ?? "").replace(/^\./, ""),
      responseType: (m.outputType ?? "").replace(/^\./, ""),
      clientStreaming: m.clientStreaming ?? false,
      serverStreaming: m.serverStreaming ?? false,
    })),
  }));

  const messages = parseDescriptors(fd.messageType ?? [], pkg);

  return { services, messages };
}

function parseDescriptors(descriptors: RawDescriptor[], scope: string): GrpcMessage[] {
  const result: GrpcMessage[] = [];
  for (const desc of descriptors) {
    const fullName = scope ? `${scope}.${desc.name ?? ""}` : (desc.name ?? "");
    result.push({
      name: fullName,
      fields: (desc.field ?? []).map((f) => ({
        name: f.name ?? "",
        number: f.number ?? 0,
        type: typeof f.type === "string" ? f.type : `TYPE_${f.type}`,
        typeName: (f.typeName ?? "").replace(/^\./, ""),
        repeated: f.label === "LABEL_REPEATED" || f.label === 3,
      })),
    });
    if (desc.nestedType?.length) {
      result.push(...parseDescriptors(desc.nestedType, fullName));
    }
  }
  return result;
}

// ── Core reflection logic ─────────────────────────────────────────────────────

function runReflection(url: string, ClientCtor: grpc.ServiceClientConstructor): Promise<Collection> {
  const client = new ClientCtor(url, grpc.credentials.createInsecure());

  return new Promise((resolve, reject) => {
    const deadline = new Date(Date.now() + 10_000);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const call = (client as any).ServerReflectionInfo({ deadline });
    const allServices: GrpcService[] = [];
    const allMessages: GrpcMessage[] = [];
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
      resolve({ url, services: Array.from(unique.values()), messages: allMessages });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    call.on("data", (response: any) => {
      if (response.listServicesResponse) {
        const names: string[] = (
          response.listServicesResponse.service as Array<{ name: string }>
        )
          .map((s) => s.name)
          .filter((n) => !n.startsWith("grpc.reflection."));

        listDone = true;
        pendingSymbols = names.length;
        if (names.length === 0) { maybeFinish(); return; }
        for (const name of names) call.write({ fileContainingSymbol: name });

      } else if (response.fileDescriptorResponse) {
        const protos: Uint8Array[] = response.fileDescriptorResponse.fileDescriptorProto ?? [];
        for (const raw of protos) {
          const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
          try {
            const parsed = parseFileDescriptor(buf, seenFiles);
            if (parsed) {
              allServices.push(...parsed.services);
              allMessages.push(...parsed.messages);
            }
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

    call.on("error", (err: Error) => { client.close(); reject(err); });
    call.write({ listServices: "" });
  });
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function discoverServices(url: string): Promise<Collection> {
  try {
    return await runReflection(url, ClientCtors.v1alpha);
  } catch (err: unknown) {
    if ((err as { code?: number }).code === grpc.status.UNIMPLEMENTED) {
      return runReflection(url, ClientCtors.v1);
    }
    throw err;
  }
}
