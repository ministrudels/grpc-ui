import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("grpcui", {
  connectServer: (url: string) =>
    ipcRenderer.invoke("grpc:connect-server", url),
});
