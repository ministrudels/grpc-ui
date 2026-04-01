import { test as base, _electron as electron, ElectronApplication, Page } from "@playwright/test";
import path from "path";

export type Fixtures = {
  app: ElectronApplication;
  window: Page;
};

export const test = base.extend<Fixtures>({
  app: async ({}, use) => {
    const app = await electron.launch({
      args: [path.join(__dirname, "../dist/main/main.js")],
      env: { ...process.env, PLAYWRIGHT: "1" }
    });
    await use(app);
    await app.close();
  },
  window: async ({ app }, use) => {
    const window = await app.firstWindow();
    await window.waitForLoadState("domcontentloaded");
    await use(window);
  }
});

export { expect } from "@playwright/test";

/** Seed localStorage with a collection and reload so the sidebar renders it. */
export async function seedCollection(
  window: Page,
  collection = {
    url: "localhost:50051",
    name: "Test",
    services: [],
    messages: [],
    fileDescriptors: []
  }
) {
  await window.evaluate((col) => {
    localStorage.setItem("grpcui:collections", JSON.stringify([col]));
  }, collection);
  await window.reload();
  await window.waitForLoadState("domcontentloaded");
}
