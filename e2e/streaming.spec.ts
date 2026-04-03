import { test, expect, addCollection, seedCollection } from "./fixtures";

const STREAMING_COLLECTION = {
  url: "localhost:50051",
  name: "Test",
  services: [{
    name: "helloworld.Greeter",
    methods: [
      { name: "SayHelloStream",  requestType: "helloworld.HelloRequest", responseType: "helloworld.HelloReply", clientStreaming: false, serverStreaming: true },
      { name: "SayHelloStream2", requestType: "helloworld.HelloRequest", responseType: "helloworld.HelloReply", clientStreaming: false, serverStreaming: true },
    ],
  }],
  messages: [{ name: "helloworld.HelloRequest", fields: [] }],
  fileDescriptors: ["AAAA"],
};

test.describe("streaming", () => {
  test("streaming method returns all messages", async ({ window, grpcServer }) => {
    await addCollection(window, "Greeter", `localhost:${grpcServer.port}`);

    await window.locator(".method").filter({ hasText: "SayHelloStream" }).first().click();
    await window.locator(".send-btn").click();

    await expect(window.locator(".response-stream")).toBeVisible({ timeout: 10_000 });
    await expect(window.locator(".response-stream")).toContainText("stream message 1", { timeout: 10_000 });
    await expect(window.locator(".response-stream")).toContainText("stream message 3");
  });

  test("sending on tab 1 does not mark tab 2 as in-flight", async ({ app, window }) => {
    await seedCollection(window, STREAMING_COLLECTION);

    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler("grpc:send-request");
      ipcMain.handle("grpc:send-request", () => new Promise(() => {}));
    });

    await window.locator(".method").filter({ hasText: "SayHelloStream" }).first().click();
    await window.locator(".send-btn").click();
    await expect(window.locator(".cancel-btn")).toBeVisible({ timeout: 5_000 });

    await window.locator(".method").filter({ hasText: "SayHelloStream2" }).first().click();
    await expect(window.locator(".send-btn")).toBeVisible();
    await expect(window.locator(".cancel-btn")).not.toBeVisible();
  });

  test("two stream tabs can both be in-flight simultaneously", async ({ app, window }) => {
    await seedCollection(window, STREAMING_COLLECTION);

    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler("grpc:send-request");
      ipcMain.handle("grpc:send-request", () => new Promise(() => {}));
    });

    await window.locator(".method").filter({ hasText: "SayHelloStream" }).first().click();
    await window.locator(".send-btn").click();
    await expect(window.locator(".cancel-btn")).toBeVisible({ timeout: 5_000 });

    await window.locator(".method").filter({ hasText: "SayHelloStream2" }).first().click();
    await window.locator(".send-btn").click();
    await expect(window.locator(".cancel-btn")).toBeVisible({ timeout: 5_000 });

    await window.locator(".tabbar-tab").filter({ hasText: "SayHelloStream" }).first().click();
    await expect(window.locator(".cancel-btn")).toBeVisible();
  });
});
