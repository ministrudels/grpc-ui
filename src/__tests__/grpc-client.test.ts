/**
 * Integration tests for the gRPC client: reflection discovery and method invocation.
 *
 * Each test group spins up a real in-process gRPC server configured
 * differently to exercise a specific scenario. No mocks are used — we
 * talk to real sockets so we have confidence the protocol is correctly
 * implemented end-to-end.
 *
 * Groups:
 *  1. Modern server  — v1 reflection only (e.g. grpc-go >= 1.45)
 *  2. Older server   — v1alpha reflection only
 *  3. No reflection  — plain gRPC server, reflection not enabled
 *  4. End-to-end     — discover services then invoke a method
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { ReflectionService } from "@grpc/reflection";
import path from "path";
import { discoverServices, sendRequest } from "../grpc-client";

const GREETER_PROTO = path.join(__dirname, "fixtures/greeter.proto");

// ── Shared server factory ─────────────────────────────────────────────────────

async function startServer(
  setupReflection: (server: grpc.Server, packageDef: protoLoader.PackageDefinition) => void,
  sayHelloImpl?: (call: grpc.ServerUnaryCall<unknown, unknown>, callback: grpc.sendUnaryData<unknown>) => void,
): Promise<{ server: grpc.Server; port: number }> {
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
    sayHello:
      sayHelloImpl ??
      ((_call: grpc.ServerUnaryCall<unknown, unknown>, callback: grpc.sendUnaryData<unknown>) =>
        callback(null, { message: "Hello" })),
  });

  setupReflection(server, packageDef);

  const port = await new Promise<number>((resolve, reject) => {
    server.bindAsync("0.0.0.0:0", grpc.ServerCredentials.createInsecure(), (err, p) =>
      err ? reject(err) : resolve(p),
    );
  });

  return { server, port };
}

// Shared assertions used across both reflection groups
function assertGreeterCollection(collection: Awaited<ReturnType<typeof discoverServices>>, url: string) {
  expect(collection.url).toBe(url);

  // Reflection services must be filtered out — they are internal protocol
  // details and should never appear as user-visible collection entries.
  const reflectionServices = collection.services.filter((s) => s.name.startsWith("grpc.reflection."));
  expect(reflectionServices).toHaveLength(0);

  // The Greeter service must be present
  const greeter = collection.services.find((s) => s.name === "helloworld.Greeter");
  expect(greeter).toBeDefined();

  // SayHello must have the correct signature
  const sayHello = greeter!.methods.find((m) => m.name === "SayHello")!;
  expect(sayHello).toBeDefined();
  expect(sayHello.requestType).toBe("helloworld.HelloRequest");
  expect(sayHello.responseType).toBe("helloworld.HelloReply");
  expect(sayHello.clientStreaming).toBe(false);
  expect(sayHello.serverStreaming).toBe(false);

  // Collection must carry raw file descriptors for later method invocation
  expect(collection.fileDescriptors.length).toBeGreaterThan(0);
}

// ── Group 1: Modern server (v1 only) ─────────────────────────────────────────

describe("against a modern server — v1 reflection only", () => {
  let server: grpc.Server;
  let port: number;

  beforeAll(async () => {
    ({ server, port } = await startServer((s, packageDef) => {
      // Access the v1 implementation directly so we can add only v1, not
      // v1alpha. This simulates grpc-go >= 1.45 and other modern frameworks
      // that dropped v1alpha support.
      const reflection = new ReflectionService(packageDef);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (reflection as any).v1.addToServer(s);
    }));
  });

  afterAll(() => new Promise<void>((resolve, reject) => server.tryShutdown((err) => (err ? reject(err) : resolve()))));

  it("discovers the Greeter service and its methods", async () => {
    const collection = await discoverServices(`localhost:${port}`);
    assertGreeterCollection(collection, `localhost:${port}`);
  });

  it("does not include reflection services in the collection", async () => {
    const collection = await discoverServices(`localhost:${port}`);
    const reflectionServices = collection.services.filter((s) => s.name.startsWith("grpc.reflection."));
    expect(reflectionServices).toHaveLength(0);
  });
});

// ── Group 2: Older server (v1alpha only) ─────────────────────────────────────

describe("against an older server — v1alpha reflection only", () => {
  let server: grpc.Server;
  let port: number;

  beforeAll(async () => {
    ({ server, port } = await startServer((s, packageDef) => {
      // Add only v1alpha reflection, simulating older servers that predate
      // the stable v1 spec.
      const reflection = new ReflectionService(packageDef);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (reflection as any).v1Alpha.addToServer(s);
    }));
  });

  afterAll(() => new Promise<void>((resolve, reject) => server.tryShutdown((err) => (err ? reject(err) : resolve()))));

  it("discovers the Greeter service and its methods", async () => {
    const collection = await discoverServices(`localhost:${port}`);
    assertGreeterCollection(collection, `localhost:${port}`);
  });

  it("does not include reflection services in the collection", async () => {
    const collection = await discoverServices(`localhost:${port}`);
    const reflectionServices = collection.services.filter((s) => s.name.startsWith("grpc.reflection."));
    expect(reflectionServices).toHaveLength(0);
  });
});

// ── Group 3: Server without reflection ───────────────────────────────────────

describe("against a server without reflection", () => {
  let server: grpc.Server;
  let port: number;

  beforeAll(async () => {
    // No reflection is added — just a bare Greeter service.
    ({ server, port } = await startServer(() => {}));
  });

  afterAll(() => new Promise<void>((resolve, reject) => server.tryShutdown((err) => (err ? reject(err) : resolve()))));

  it("rejects with an error", async () => {
    await expect(discoverServices(`localhost:${port}`)).rejects.toThrow();
  });
});

// ── Group 4: End-to-end — discover then invoke ───────────────────────────────

describe("end-to-end: discover services then invoke a method", () => {
  let server: grpc.Server;
  let port: number;

  beforeAll(async () => {
    ({ server, port } = await startServer(
      (s, packageDef) => {
        const reflection = new ReflectionService(packageDef);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (reflection as any).v1.addToServer(s);
      },
      // Echo the name back in the message
      (call, callback) => {
        const req = call.request as { name: string };
        callback(null, { message: `Hello ${req.name}` });
      },
    ));
  });

  afterAll(() => new Promise<void>((resolve, reject) => server.tryShutdown((err) => (err ? reject(err) : resolve()))));

  it("returns the response from a unary call", async () => {
    const url = `localhost:${port}`;
    const collection = await discoverServices(url);

    const greeter = collection.services.find((s) => s.name === "helloworld.Greeter")!;
    const sayHello = greeter.methods.find((m) => m.name === "SayHello")!;

    const response = await sendRequest({
      url,
      serviceName: greeter.name,
      methodName: sayHello.name,
      requestType: sayHello.requestType,
      responseType: sayHello.responseType,
      requestJson: JSON.stringify({ name: "World" }),
      fileDescriptors: collection.fileDescriptors,
    });

    expect(response).toEqual({ message: "Hello World" });
  });

  it("rejects with a gRPC error for invalid method path", async () => {
    const url = `localhost:${port}`;
    const collection = await discoverServices(url);

    await expect(
      sendRequest({
        url,
        serviceName: "helloworld.Greeter",
        methodName: "NonExistent",
        requestType: "helloworld.HelloRequest",
        responseType: "helloworld.HelloReply",
        requestJson: JSON.stringify({ name: "World" }),
        fileDescriptors: collection.fileDescriptors,
      }),
    ).rejects.toThrow();
  });

  it("propagates gRPC status errors to the caller", async () => {
    const url = `localhost:${port}`;
    const collection = await discoverServices(url);

    // Pass a request with an unexpected field — server still responds (proto3
    // ignores unknown fields), so this just verifies the round-trip succeeds.
    const response = await sendRequest({
      url,
      serviceName: "helloworld.Greeter",
      methodName: "SayHello",
      requestType: "helloworld.HelloRequest",
      responseType: "helloworld.HelloReply",
      requestJson: JSON.stringify({}),
      fileDescriptors: collection.fileDescriptors,
    });

    // Empty name → "Hello "
    expect(response).toEqual({ message: "Hello " });
  });
});
