import { app, BrowserWindow, ipcMain, Menu, nativeImage } from "electron";
import path from "path";
import { discoverServices, sendRequest, type SendRequestArgs } from "./grpc-client";

function openSettings(): void {
  BrowserWindow.getFocusedWindow()?.webContents.send("grpc:open-settings");
}

function buildMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      // On macOS this label is replaced by the app name automatically
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        {
          label: "Settings",
          accelerator: "CmdOrCtrl+,",
          click: openSettings
        },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" }
      ]
    },
    { role: "editMenu" as const },
    { role: "viewMenu" as const },
    { role: "windowMenu" as const }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
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

const requestAborts = new Map<string, AbortController>();

ipcMain.handle("grpc:send-request", async (event, { requestId, ...args }: SendRequestArgs & { requestId: string }) => {
  const abort = new AbortController();
  requestAborts.set(requestId, abort);
  try {
    return await sendRequest(args, abort.signal, (data) => {
      event.sender.send("grpc:stream-data", { requestId, data });
    });
  } finally {
    requestAborts.delete(requestId);
  }
});

ipcMain.on("grpc:cancel-request", (_event, requestId: string) => {
  requestAborts.get(requestId)?.abort();
  requestAborts.delete(requestId);
});

app.whenReady().then(() => {
  buildMenu();
  createWindow();
  if (process.platform === "darwin" && app.dock) {
    app.dock.setIcon(
      nativeImage.createFromPath(
        app.isPackaged
          ? path.join(__dirname, "../assets/icon.icns")
          : path.join(__dirname, "../../src/assets/icon.icns")
      )
    );
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
