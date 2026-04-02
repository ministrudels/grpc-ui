export {};

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
  messages: GrpcMessage[];
  fileDescriptors: string[];
}

export type NamedCollection = Collection & { name: string };

export interface SendRequestArgs {
  url: string;
  serviceName: string;
  methodName: string;
  requestType: string;
  responseType: string;
  requestJson: string;
  fileDescriptors: string[];
  metadata?: Array<{ key: string; value: string }>;
  serverStreaming?: boolean;
}

export type ReflectProgress =
  | { url: string; stage: "listing" }
  | { url: string; stage: "fetching"; servicesFound: number; filesFetched: number; pending: number };

declare global {
  interface Window {
    grpcui: {
      connectServer: (url: string) => Promise<Collection>;
      sendRequest: (args: SendRequestArgs, requestId: string) => Promise<unknown>;
      cancelRequest: (requestId: string) => void;
      onReflectProgress: (cb: (progress: ReflectProgress) => void) => () => void;
      onStreamData: (cb: (payload: { requestId: string; data: unknown }) => void) => () => void;
    };
  }
}
