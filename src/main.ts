import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { discoverServices, sendRequest } from "./grpc-client";

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (!app.isPackaged && !process.env.PLAYWRIGHT) {
    win.loadURL("http://localhost:5173");
  } else {
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

ipcMain.handle("grpc:connect-server", async (event, url: string) => {
  return discoverServices(url, (progress) => {
    event.sender.send("grpc:reflect-progress", progress);
  });
});

let currentRequestAbort: AbortController | null = null;

ipcMain.handle("grpc:send-request", async (_event, args) => {
  currentRequestAbort = new AbortController();
  try {
    return await sendRequest(args, currentRequestAbort.signal);
  } finally {
    currentRequestAbort = null;
  }
});

ipcMain.on("grpc:cancel-request", () => {
  currentRequestAbort?.abort();
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
