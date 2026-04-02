import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("grpcui", {
  connectServer: (url: string) =>
    ipcRenderer.invoke("grpc:connect-server", url),
  sendRequest: (args: unknown, requestId: string) =>
    ipcRenderer.invoke("grpc:send-request", { ...(args as object), requestId }),
  cancelRequest: (requestId: string) =>
    ipcRenderer.send("grpc:cancel-request", requestId),
  onReflectProgress: (cb: (progress: unknown) => void) => {
    const listener = (_event: unknown, progress: unknown) => cb(progress);
    ipcRenderer.on("grpc:reflect-progress", listener as Parameters<typeof ipcRenderer.on>[1]);
    return () => ipcRenderer.removeListener("grpc:reflect-progress", listener as Parameters<typeof ipcRenderer.removeListener>[1]);
  },
});
