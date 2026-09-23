import { describe, it, expect } from "vitest";
import { buildGrpcurlCommand } from "../renderer/grpcurl";

describe("buildGrpcurlCommand", () => {
  it("builds a plaintext command with target and method path", () => {
    const cmd = buildGrpcurlCommand({
      targetUrl: "localhost:50051",
      serviceName: "helloworld.Greeter",
      methodName: "SayHello",
      requestBody: '{\n  "name": "world"\n}',
      metadata: []
    });

    expect(cmd).toContain("grpcurl -plaintext");
    expect(cmd).toContain("localhost:50051 helloworld.Greeter/SayHello");
    expect(cmd).not.toContain("-proto");
    expect(cmd).not.toContain("-protoset");
  });

  it("includes the request body as a -d flag", () => {
    const cmd = buildGrpcurlCommand({
      targetUrl: "localhost:50051",
      serviceName: "helloworld.Greeter",
      methodName: "SayHello",
      requestBody: '{"name":"world"}',
      metadata: []
    });

    expect(cmd).toContain(`-d '{"name":"world"}'`);
  });

  it("omits -d when the request body is empty", () => {
    const cmd = buildGrpcurlCommand({
      targetUrl: "localhost:50051",
      serviceName: "helloworld.Greeter",
      methodName: "SayHello",
      requestBody: "   ",
      metadata: []
    });

    expect(cmd).not.toContain("-d");
  });

  it("adds a -H flag per non-empty metadata row", () => {
    const cmd = buildGrpcurlCommand({
      targetUrl: "localhost:50051",
      serviceName: "helloworld.Greeter",
      methodName: "SayHello",
      requestBody: "{}",
      metadata: [
        { key: "authorization", value: "Bearer xyz" },
        { key: "", value: "ignored" },
        { key: "  ", value: "ignored" }
      ]
    });

    expect(cmd).toContain(`-H 'authorization: Bearer xyz'`);
    expect(cmd.match(/-H /g)).toHaveLength(1);
  });

  it("escapes embedded single quotes so the result is safe to paste into a shell", () => {
    const cmd = buildGrpcurlCommand({
      targetUrl: "localhost:50051",
      serviceName: "helloworld.Greeter",
      methodName: "SayHello",
      requestBody: '{"name":"O\'Brien"}',
      metadata: [{ key: "x-note", value: "it's fine" }]
    });

    expect(cmd).toContain(`-d '{"name":"O'\\''Brien"}'`);
    expect(cmd).toContain(`-H 'x-note: it'\\''s fine'`);
  });
});
