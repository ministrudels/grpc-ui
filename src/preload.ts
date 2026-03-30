import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("grpcui", {
  connectServer: (url: string) =>
    ipcRenderer.invoke("grpc:connect-server", url),
  sendRequest: (args: unknown) =>
    ipcRenderer.invoke("grpc:send-request", args),
});
