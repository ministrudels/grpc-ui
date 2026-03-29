export {};

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

declare global {
  interface Window {
    grpcui: {
      connectServer: (url: string) => Promise<Collection>;
    };
  }
}
