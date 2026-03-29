import { app, BrowserWindow } from "electron";
import path from "path";

function createWindow(): void {
  const win = new BrowserWindow({
    width: 400,
    height: 200,
    webPreferences: {
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, "../index.html"));
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
