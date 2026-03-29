import { contextBridge } from "electron";

// IPC bridge will be exposed here in Phase 2
contextBridge.exposeInMainWorld("grpcui", {});
