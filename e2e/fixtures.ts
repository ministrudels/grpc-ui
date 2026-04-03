import { test as base, _electron as electron, ElectronApplication, Page } from "@playwright/test";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { ReflectionService } from "@grpc/reflection";
import path from "path";

export type Fixtures = {
  app: ElectronApplication;
  window: Page;
  grpcServer: { port: number };
};

const GREETER_PROTO = path.join(__dirname, "../src/__tests__/fixtures/greeter.proto");

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
  },
  grpcServer: async ({}, use) => {
    const packageDef = protoLoader.loadSync(GREETER_PROTO, {
      keepCase: false,
      longs: String,
      enums: String,
      defaults: true,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pkg = grpc.loadPackageDefinition(packageDef) as any;
    const server = new grpc.Server();

    server.addService(pkg.helloworld.Greeter.service, {
      sayHello: (_call: grpc.ServerUnaryCall<unknown, unknown>, callback: grpc.sendUnaryData<unknown>) => {
        callback(null, { message: "Hello from test server" });
      },
      sayHelloStream: (call: grpc.ServerWritableStream<unknown, unknown>) => {
        call.write({ message: "stream message 1" });
        call.write({ message: "stream message 2" });
        call.write({ message: "stream message 3" });
        call.end();
      },
      sayHelloStream2: (call: grpc.ServerWritableStream<unknown, unknown>) => {
        call.write({ message: "stream2 message 1" });
        call.write({ message: "stream2 message 2" });
        call.end();
      },
    });

    const reflection = new ReflectionService(packageDef);
    reflection.addToServer(server);

    const port = await new Promise<number>((resolve, reject) => {
      server.bindAsync("0.0.0.0:0", grpc.ServerCredentials.createInsecure(), (err, p) =>
        err ? reject(err) : resolve(p)
      );
    });

    await use({ port });

    server.forceShutdown();
  },
});

export { expect } from "@playwright/test";

/** Add a collection via the UI dialog (real reflection — gives valid file descriptors). */
export async function addCollection(window: Page, name: string, url: string) {
  await window.evaluate(() => localStorage.removeItem("grpcui:collections"));
  await window.reload();
  await window.waitForLoadState("domcontentloaded");
  await window.locator("button[title='Add collection']").click();
  await window.locator(".dialog-input").nth(0).fill(name);
  await window.locator(".dialog-input").nth(1).fill(url);
  await window.locator(".dialog-confirm").click();
  await window.locator(".sidebar-overlay").waitFor({ state: "hidden" });
}

/** Seed localStorage with a collection and reload so the sidebar renders it. */
export async function seedCollection(
  window: Page,
  collection: object = {
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
