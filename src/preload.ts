import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("grpcui", {
  connectServer: (url: string) =>
    ipcRenderer.invoke("grpc:connect-server", url),
  sendRequest: (args: unknown) =>
    ipcRenderer.invoke("grpc:send-request", args),
  cancelRequest: () =>
    ipcRenderer.send("grpc:cancel-request"),
  onReflectProgress: (cb: (progress: unknown) => void) => {
    const listener = (_event: unknown, progress: unknown) => cb(progress);
    ipcRenderer.on("grpc:reflect-progress", listener as Parameters<typeof ipcRenderer.on>[1]);
    return () => ipcRenderer.removeListener("grpc:reflect-progress", listener as Parameters<typeof ipcRenderer.removeListener>[1]);
  },
});
