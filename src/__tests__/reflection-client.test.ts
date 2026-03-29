/**
 * Integration test for discoverServices.
 *
 * Strategy: spin up a real in-process gRPC server with a known service
 * (helloworld.Greeter) and server reflection enabled, then call
 * discoverServices against it and assert the returned collection matches
 * the known schema exactly.
 *
 * This is an integration test, not a unit test. We talk to a real gRPC
 * server over a real socket. There are no mocks. This gives us confidence
 * that the reflection protocol is correctly implemented end-to-end — if
 * we mocked the server we would only be testing our own serialisation
 * round-trip, not the actual protocol.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { ReflectionService } from "@grpc/reflection";
import path from "path";
import { discoverServices } from "../reflection-client";

// The proto file that defines the test service. We use @grpc/proto-loader
// here (rather than our inline reflection client approach) because this is
// the server side — proto-loader is the standard way to load a service
// definition when setting up a grpc-js server.
const GREETER_PROTO = path.join(__dirname, "fixtures/greeter.proto");

describe("discoverServices", () => {
  let server: grpc.Server;
  let port: number;

  beforeAll(async () => {
    // Load the Greeter proto and create a package definition that grpc-js
    // and @grpc/reflection both understand.
    const packageDef = protoLoader.loadSync(GREETER_PROTO, {
      keepCase: false,
      longs: String,
      enums: String,
      defaults: true,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pkg = grpc.loadPackageDefinition(packageDef) as any;

    server = new grpc.Server();

    // Register the Greeter service with a stub implementation. The handler
    // logic doesn't matter — we only care that reflection can describe it.
    server.addService(pkg.helloworld.Greeter.service, {
      sayHello: (
        _call: grpc.ServerUnaryCall<unknown, unknown>,
        callback: grpc.sendUnaryData<unknown>
      ) => {
        callback(null, { message: "Hello" });
      },
    });

    // Attach server reflection. ReflectionService reads the package
    // definition and exposes the grpc.reflection.v1alpha endpoints so
    // clients can ask "what services do you have?".
    const reflection = new ReflectionService(packageDef);
    reflection.addToServer(server);

    // Bind to port 0 so the OS picks a free port, avoiding conflicts.
    await new Promise<void>((resolve, reject) => {
      server.bindAsync(
        "0.0.0.0:0",
        grpc.ServerCredentials.createInsecure(),
        (err, boundPort) => {
          if (err) return reject(err);
          port = boundPort;
          resolve();
        }
      );
    });
  });

  afterAll(() => {
    server.forceShutdown();
  });

  it("returns the url in the collection", async () => {
    const collection = await discoverServices(`localhost:${port}`);
    expect(collection.url).toBe(`localhost:${port}`);
  });

  it("discovers the Greeter service", async () => {
    const collection = await discoverServices(`localhost:${port}`);
    const service = collection.services.find(
      (s) => s.name === "helloworld.Greeter"
    );
    expect(service).toBeDefined();
  });

  it("discovers the SayHello method with correct types", async () => {
    const collection = await discoverServices(`localhost:${port}`);
    const service = collection.services.find(
      (s) => s.name === "helloworld.Greeter"
    )!;
    const method = service.methods.find((m) => m.name === "SayHello")!;

    expect(method).toBeDefined();
    expect(method.requestType).toBe("helloworld.HelloRequest");
    expect(method.responseType).toBe("helloworld.HelloReply");
    expect(method.clientStreaming).toBe(false);
    expect(method.serverStreaming).toBe(false);
  });
});
