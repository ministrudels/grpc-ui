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
}

declare global {
  interface Window {
    grpcui: {
      connectServer: (url: string) => Promise<Collection>;
    };
  }
}
