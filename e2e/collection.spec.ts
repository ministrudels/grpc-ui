import { test, expect, seedCollection } from "./fixtures";
import type { Page } from "@playwright/test";

const COLLECTION_WITH_METHOD = {
  url: "localhost:50051",
  name: "Test",
  services: [
    {
      name: "helloworld.Greeter",
      methods: [
        {
          name: "SayHello",
          requestType: "helloworld.HelloRequest",
          responseType: "helloworld.HelloReply",
          clientStreaming: false,
          serverStreaming: false,
        },
      ],
    },
  ],
  messages: [{ name: "helloworld.HelloRequest", fields: [] }],
  // Non-empty so App.tsx doesn't short-circuit with "No schema available"
  fileDescriptors: ["AAAA"],
};

/** Clear persisted collections and add one via the dialog, then wait for sync. */
async function addCollection(window: Page, name: string, url: string) {
  // Clear any collections persisted to disk from previous test runs
  await window.evaluate(() => localStorage.removeItem("grpcui:collections"));
  await window.reload();
  await window.waitForLoadState("domcontentloaded");

  await window.locator(".sidebar-add-btn").click();
  await window.locator(".dialog-input").nth(0).fill(name);
  await window.locator(".dialog-input").nth(1).fill(url);
  await window.locator(".dialog-confirm").click();
  // Wait until the loading overlay disappears
  await window.locator(".sidebar-overlay").waitFor({ state: "hidden" });
}

test.describe("happy path", () => {
  test("add collection → sidebar populates with services and methods", async ({ window, grpcServer }) => {
    await addCollection(window, "Greeter", `localhost:${grpcServer.port}`);

    await expect(window.locator(".service-name")).toBeVisible();
    await expect(window.locator(".method-name").filter({ hasText: "SayHello" }).first()).toBeVisible();
  });

  test("select method → send request → response panel shows result", async ({ window, grpcServer }) => {
    await addCollection(window, "Greeter", `localhost:${grpcServer.port}`);

    await window.locator(".method").filter({ hasText: "SayHello" }).first().click();
    await window.locator(".send-btn").click();

    // Response panel should show the Monaco editor (success, not error)
    await expect(window.locator(".response-editor")).toBeVisible({ timeout: 10_000 });
    await expect(window.locator(".response-error")).not.toBeVisible();
  });

  test("successful response contains expected JSON", async ({ window, grpcServer }) => {
    await addCollection(window, "Greeter", `localhost:${grpcServer.port}`);

    await window.locator(".method").filter({ hasText: "SayHello" }).first().click();
    await window.locator(".send-btn").click();

    await expect(window.locator(".response-editor")).toContainText("Hello from test server", { timeout: 10_000 });
  });
});

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

test.describe("cancel button", () => {
  test("cancels an in-flight request and shows 'Request cancelled.'", async ({ app, window }) => {
    await seedCollection(window, COLLECTION_WITH_METHOD);

    // Replace send-request with a handler that hangs until grpc:cancel-request fires,
    // mirroring the real AbortController flow in main.ts / grpc-client.ts.
    await app.evaluate(({ ipcMain }) => {
      ipcMain.removeHandler("grpc:send-request");
      ipcMain.removeAllListeners("grpc:cancel-request");

      let abort: (() => void) | null = null;

      ipcMain.handle("grpc:send-request", () =>
        new Promise<never>((_, reject) => {
          abort = () => reject(new Error("Cancelled"));
        })
      );

      ipcMain.on("grpc:cancel-request", () => abort?.());
    });

    // Select the method so the Send button becomes enabled
    await window.locator(".method").first().click();

    // Send — button should flip to Cancel
    await window.locator(".send-btn").click();
    await expect(window.locator(".cancel-btn")).toBeVisible();

    // Cancel — Send should return and the response panel should show the message
    await window.locator(".cancel-btn").click();
    await expect(window.locator(".send-btn")).toBeVisible();
    await expect(window.locator(".response-error")).toContainText("Request cancelled.");
  });
});
