export {};

declare global {
  interface Window {
    grpcui: {
      connectServer: (url: string) => Promise<{ url: string }>;
    };
  }
}
