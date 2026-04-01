import { test, expect, seedCollection } from "./fixtures";

test.describe("sync button", () => {
  test("stays disabled while request is in-flight", async ({ app, window }) => {
    await seedCollection(window);

    // Replace the IPC handler with one that hangs so we can assert mid-flight
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler("grpc:connect-server");
      ipcMain.handle(
        "grpc:connect-server",
        () => new Promise(() => {}) // never resolves
      );
    });

    const btn = window.locator(".resync-btn");
    await btn.click();
    await expect(btn).toBeDisabled();
  });
});
