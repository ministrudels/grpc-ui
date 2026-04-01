import * as grpc from "@grpc/grpc-js";
import * as protobuf from "protobufjs";
import "protobufjs/ext/descriptor";
import * as fs from "fs";
import path from "path";

function findProtoDir(): string {
  const candidates = [
    path.join(__dirname, "../../src/proto"), // dev: dist/main/ → src/proto/ (always up to date)
    path.join(__dirname, "../proto"), // production build: dist/main/ → dist/proto/
    path.join(__dirname, "proto") // vitest: src/ → src/proto/
  ];
  const found = candidates.find((dir) => fs.existsSync(path.join(dir, "reflection_v1alpha.proto")));
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
  /** Raw FileDescriptorProto bytes (base64) — used to invoke methods */
  fileDescriptors: string[];
}

export interface SendRequestArgs {
  url: string;
  serviceName: string;
  methodName: string;
  requestType: string;
  responseType: string;
  requestJson: string;
  fileDescriptors: string[];
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
        requestSerialize: (req: object) => Buffer.from(ReqType.encode(ReqType.fromObject(req)).finish()),
        requestDeserialize: (buf: Buffer) => ReqType.toObject(ReqType.decode(buf), { defaults: true, arrays: true }),
        responseSerialize: (res: object) => Buffer.from(ResType.encode(ResType.fromObject(res)).finish()),
        responseDeserialize: (buf: Buffer) => ResType.toObject(ResType.decode(buf), { defaults: true, arrays: true })
      }
    },
    "ServerReflection"
  );
}

const ClientCtors = {
  v1alpha: makeReflectionClientCtor("reflection_v1alpha.proto", "grpc.reflection.v1alpha"),
  v1: makeReflectionClientCtor("reflection_v1.proto", "grpc.reflection.v1")
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
  /** Imported proto file names, e.g. ["google/protobuf/empty.proto"] */
  dependency?: string[];
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
): { services: GrpcService[]; messages: GrpcMessage[]; dependencies: string[] } | null {
  const fd = FileDescriptorProtoType.toObject(FileDescriptorProtoType.decode(bytes), {
    defaults: true,
    arrays: true,
    enums: String
  }) as RawFileDescriptor;

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
      serverStreaming: m.serverStreaming ?? false
    }))
  }));

  const messages = parseDescriptors(fd.messageType ?? [], pkg);

  return { services, messages, dependencies: fd.dependency ?? [] };
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
        repeated: f.label === "LABEL_REPEATED" || f.label === 3
      }))
    });
    if (desc.nestedType?.length) {
      result.push(...parseDescriptors(desc.nestedType, fullName));
    }
  }
  return result;
}

// ── Core reflection logic ─────────────────────────────────────────────────────

function runReflection(
  url: string,
  ClientCtor: grpc.ServiceClientConstructor,
  onProgress?: (progress: ReflectProgress) => void
): Promise<Collection> {
  const client = new ClientCtor(url, grpc.credentials.createInsecure());

  return new Promise((resolve, reject) => {
    const deadline = new Date(Date.now() + 30_000);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const call = (client as any).ServerReflectionInfo({ deadline });
    const allServices: GrpcService[] = [];
    const allMessages: GrpcMessage[] = [];
    const allFileDescriptors: string[] = [];
    const seenFiles = new Set<string>();
    // Symbols (service or type names) already requested via fileContainingSymbol
    const requestedSymbols = new Set<string>();
    let pendingSymbols = 0;
    let listDone = false;
    let servicesFound = 0;

    function maybeFinish() {
      if (!listDone || pendingSymbols > 0) return;
      call.end();
      client.close();
      const unique = new Map<string, GrpcService>();
      for (const s of allServices) {
        if (!unique.has(s.name)) unique.set(s.name, s);
      }
      resolve({
        url,
        services: Array.from(unique.values()),
        messages: allMessages,
        fileDescriptors: allFileDescriptors
      });
    }

    const requestedFileNames = new Set<string>();

    // Request a symbol (type or service name) if not already requested.
    function requestSymbol(name: string) {
      if (!name || requestedSymbols.has(name)) return;
      requestedSymbols.add(name);
      pendingSymbols++;
      call.write({ fileContainingSymbol: name });
    }

    // Request a file by filename if not already requested.
    function requestFile(filename: string) {
      if (!filename || requestedFileNames.has(filename) || seenFiles.has(filename)) return;
      requestedFileNames.add(filename);
      pendingSymbols++;
      call.write({ fileByFilename: filename });
    }

    // Process a batch of FileDescriptorProto bytes from a single response.
    // Adds new files to allFileDescriptors and recursively requests any type
    // symbols not yet covered (handles servers with empty dependency fields).
    function processFileDescriptors(protos: Uint8Array[]) {
      for (const raw of protos) {
        const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
        try {
          const parsed = parseFileDescriptor(buf, seenFiles);
          if (!parsed) continue;
          allFileDescriptors.push(buf.toString("base64"));
          allServices.push(...parsed.services);
          allMessages.push(...parsed.messages);

          // Chase explicit file dependencies by filename — catches enums and any
          // other types that aren't reachable via symbol chasing alone.
          for (const dep of parsed.dependencies) {
            requestFile(dep);
          }

          // Chase method input/output types
          for (const svc of parsed.services) {
            for (const method of svc.methods) {
              requestSymbol(method.requestType);
              requestSymbol(method.responseType);
            }
          }

          // Chase TYPE_MESSAGE and TYPE_ENUM field types so resolveAll() can
          // resolve the full type graph including cross-package enum references.
          for (const msg of parsed.messages) {
            for (const field of msg.fields) {
              if ((field.type === "TYPE_MESSAGE" || field.type === "TYPE_ENUM") && field.typeName) {
                requestSymbol(field.typeName);
              }
            }
          }
        } catch {
          // ignore malformed descriptors
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    call.on("data", (response: any) => {
      if (response.listServicesResponse) {
        const names: string[] = (response.listServicesResponse.service as Array<{ name: string }>)
          .map((s) => s.name)
          .filter((n) => !n.startsWith("grpc.reflection."));

        listDone = true;
        servicesFound = names.length;
        pendingSymbols = names.length;
        onProgress?.({ url, stage: "fetching", servicesFound, filesFetched: 0, pending: pendingSymbols });
        if (names.length === 0) {
          maybeFinish();
          return;
        }
        for (const name of names) {
          requestedSymbols.add(name);
          call.write({ fileContainingSymbol: name });
        }
      } else if (response.fileDescriptorResponse) {
        const protos: Uint8Array[] = response.fileDescriptorResponse.fileDescriptorProto ?? [];
        processFileDescriptors(protos);
        pendingSymbols--;
        onProgress?.({ url, stage: "fetching", servicesFound, filesFetched: allFileDescriptors.length, pending: pendingSymbols });
        maybeFinish();
      } else if (response.errorResponse) {
        pendingSymbols--;
        maybeFinish();
      }
    });

    call.on("error", (err: Error) => {
      client.close();
      reject(err);
    });
    onProgress?.({ url, stage: "listing" });
    call.write({ listServices: "" });
  });
}

// ── discoverServices ──────────────────────────────────────────────────────────

export type ReflectProgress =
  | { url: string; stage: "listing" }
  | { url: string; stage: "fetching"; servicesFound: number; filesFetched: number; pending: number };

export async function discoverServices(
  url: string,
  onProgress?: (progress: ReflectProgress) => void
): Promise<Collection> {
  try {
    return await runReflection(url, ClientCtors.v1alpha, onProgress);
  } catch (err: unknown) {
    if ((err as { code?: number }).code === grpc.status.UNIMPLEMENTED) {
      return runReflection(url, ClientCtors.v1, onProgress);
    }
    throw err;
  }
}

// ── sendRequest ───────────────────────────────────────────────────────────────

export async function sendRequest(args: SendRequestArgs, signal?: AbortSignal): Promise<unknown> {
  const { url, serviceName, methodName, requestType, responseType, requestJson, fileDescriptors } = args;

  // Re-encode individual FileDescriptorProtos into a FileDescriptorSet binary so
  // protobufjs/ext/descriptor can build a fully-resolved Root from them.
  // FileDescriptorSet = { repeated FileDescriptorProto file = 1; }
  // We write each proto as field 1 (tag 0x0a), length-delimited.
  const writer = protobuf.Writer.create();
  for (const b64 of fileDescriptors) {
    writer.uint32(/* field 1, wire type 2 */ 10).bytes(Buffer.from(b64, "base64"));
  }
  const fileSetBytes = Buffer.from(writer.finish());

  // fromDescriptor populates the root then calls root.resolveAll() as its final step.
  // If the descriptor set contains `extend .google.protobuf.EnumValueOptions` (custom enum
  // annotations), resolveAll() throws because descriptor.proto (which defines EnumValueOptions)
  // is a well-known type that servers don't serve via reflection. These extensions are metadata
  // only — they don't affect wire encoding. We intercept resolveAll on the prototype for the
  // duration of this call so the root is returned fully built rather than lost to the throw.
  const origResolveAll = protobuf.Root.prototype.resolveAll;
  protobuf.Root.prototype.resolveAll = function (this: protobuf.Root) {
    try {
      return origResolveAll.call(this);
    } catch (e) {
      const msg = (e as Error).message ?? "";
      if (msg.startsWith("unresolvable extensions")) return this;
      throw e;
    }
  };
  let root: protobuf.Root;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    root = (protobuf.Root as any).fromDescriptor(fileSetBytes);
  } finally {
    protobuf.Root.prototype.resolveAll = origResolveAll;
  }

  let RequestType: protobuf.Type;
  let ResponseType: protobuf.Type;
  try {
    RequestType = root.lookupType(requestType.replace(/^\./, ""));
  } catch (e) {
    throw new Error(`[lookupType] Request type not found: ${requestType} — ${(e as Error).message}`);
  }
  try {
    ResponseType = root.lookupType(responseType.replace(/^\./, ""));
  } catch (e) {
    throw new Error(`[lookupType] Response type not found: ${responseType} — ${(e as Error).message}`);
  }

  let requestBytes: Buffer;
  try {
    const requestObj = JSON.parse(requestJson) as Record<string, unknown>;
    const requestMessage = RequestType.fromObject(requestObj);
    requestBytes = Buffer.from(RequestType.encode(requestMessage).finish());
  } catch (e) {
    throw new Error(`[encode] Failed to encode request: ${(e as Error).message}`);
  }

  const client = new grpc.Client(url, grpc.credentials.createInsecure());
  return new Promise((resolve, reject) => {
    const deadline = new Date(Date.now() + 30_000);
    const call = client.makeUnaryRequest(
      `/${serviceName}/${methodName}`,
      (req: Buffer) => req,
      (buf: Buffer) => {
        try {
          return ResponseType.toObject(ResponseType.decode(buf), { defaults: true, arrays: true });
        } catch (e) {
          throw new Error(`[decode] Failed to decode response: ${(e as Error).message}`);
        }
      },
      requestBytes,
      new grpc.Metadata(),
      { deadline },
      (err, response) => {
        client.close();
        if (err) reject(err);
        else resolve(response);
      }
    );
    signal?.addEventListener("abort", () => {
      call.cancel();
      client.close();
      reject(new Error("Cancelled"));
    }, { once: true });
  });
}
