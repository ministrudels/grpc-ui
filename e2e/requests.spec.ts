import { test, expect, addCollection, seedCollection } from "./fixtures";

const UNARY_COLLECTION = {
  url: "localhost:50051",
  name: "Test",
  services: [{
    name: "helloworld.Greeter",
    methods: [{
      name: "SayHello",
      requestType: "helloworld.HelloRequest",
      responseType: "helloworld.HelloReply",
      clientStreaming: false,
      serverStreaming: false,
    }],
  }],
  messages: [{ name: "helloworld.HelloRequest", fields: [] }],
  fileDescriptors: ["AAAA"],
};

test.describe("requests", () => {
  test("select method → send → response panel shows result", async ({ window, grpcServer }) => {
    await addCollection(window, "Greeter", `localhost:${grpcServer.port}`);

    await window.locator(".method").filter({ hasText: "SayHello" }).first().click();
    await window.locator(".send-btn").click();

    await expect(window.locator(".response-editor")).toBeVisible({ timeout: 10_000 });
    await expect(window.locator(".response-error")).not.toBeVisible();
  });

  test("successful response contains expected JSON", async ({ window, grpcServer }) => {
    await addCollection(window, "Greeter", `localhost:${grpcServer.port}`);

    await window.locator(".method").filter({ hasText: "SayHello" }).first().click();
    await window.locator(".send-btn").click();

    await expect(window.locator(".response-editor")).toContainText("Hello from test server", { timeout: 10_000 });
  });

  test("cancel in-flight request → shows 'Request cancelled.'", async ({ app, window }) => {
    await seedCollection(window, UNARY_COLLECTION);

    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler("grpc:send-request");
      ipcMain.removeAllListeners("grpc:cancel-request");

      let abort: (() => void) | null = null;
      ipcMain.handle("grpc:send-request", () =>
        new Promise<never>((_, reject) => { abort = () => reject(new Error("Cancelled")); })
      );
      ipcMain.on("grpc:cancel-request", () => abort?.());
    });

    await window.locator(".method").first().click();
    await window.locator(".send-btn").click();
    await expect(window.locator(".cancel-btn")).toBeVisible();

    await window.locator(".cancel-btn").click();
    await expect(window.locator(".send-btn")).toBeVisible();
    await expect(window.locator(".response-error")).toContainText("Request cancelled.");
  });
});
