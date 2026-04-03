import { test, expect, addCollection } from "./fixtures";

test.describe("collection", () => {
  test("add collection → sidebar populates with services and methods", async ({ window, grpcServer }) => {
    await addCollection(window, "Greeter", `localhost:${grpcServer.port}`);

    await expect(window.locator(".service-name")).toBeVisible();
    await expect(window.locator(".method-name").filter({ hasText: "SayHello" }).first()).toBeVisible();
  });

  test("sync button stays disabled while resync is in-flight", async ({ app, window }) => {
    await window.evaluate(() => {
      localStorage.setItem("grpcui:collections", JSON.stringify([{
        url: "localhost:50051", name: "Test", services: [], messages: [], fileDescriptors: []
      }]));
    });
    await window.reload();
    await window.waitForLoadState("domcontentloaded");

    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler("grpc:connect-server");
      ipcMain.handle("grpc:connect-server", () => new Promise(() => {}));
    });

    const btn = window.locator(".resync-btn");
    await btn.click();
    await expect(btn).toBeDisabled();
  });
});
