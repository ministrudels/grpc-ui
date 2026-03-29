# Proto definitions

These files are not your application's schema — they are the **fixed, standardised
protocols** needed to speak to any gRPC server's reflection endpoint and to read
what it returns back.

---

## reflection_v1alpha.proto and reflection_v1.proto

**What they are:** The schema for the gRPC Server Reflection service. Two versions
exist (`grpc.reflection.v1alpha` and `grpc.reflection.v1`) with identical message
structures — only the package name and therefore the RPC path differs.

**Why they're necessary:** Server reflection is itself a gRPC service. Like any gRPC
service, you must know how to serialise its requests and deserialise its responses
before you can call it. There is no way to bootstrap around this — you cannot use
reflection to discover reflection's own schema.

**Why two versions:** The v1alpha version was the original; many newer servers
(notably grpc-go since v1.45) only expose v1. The client tries v1alpha first and
falls back to v1 on `UNIMPLEMENTED`. Both are part of the official gRPC
specification:

> https://github.com/grpc/grpc/blob/master/src/proto/grpc/reflection/v1alpha/reflection.proto
> https://github.com/grpc/grpc/blob/master/src/proto/grpc/reflection/v1/reflection.proto

We omit the `ExtensionRequest` / `all_extension_numbers_*` fields as we do not
use extension-based reflection.

---

## descriptor.proto

**What it is:** A minimal subset of Google's `google/protobuf/descriptor.proto`,
containing only the fields needed to extract service and method information.

**Why it's necessary:** The reflection service does not return a human-readable
description of your server's services. It returns serialised bytes of a
`FileDescriptorProto` — Google's standard binary format for describing a proto
file. To decode those bytes and read the service names, method names, and
request/response types out of them, you must know the structure of
`FileDescriptorProto`.

This structure is defined by Google as part of the protobuf specification and
never changes. Our copy is a verbatim subset of the canonical source:

> https://github.com/protocolbuffers/protobuf/blob/main/src/google/protobuf/descriptor.proto

We include only the fields we actually use:

| Field | Source field number | Purpose |
|---|---|---|
| `FileDescriptorProto.name` | 1 | Deduplicate files we have already parsed |
| `FileDescriptorProto.package` | 2 | Build the fully-qualified service name |
| `FileDescriptorProto.service` | 6 | List of services in this file |
| `ServiceDescriptorProto.name` | 1 | Service name |
| `ServiceDescriptorProto.method` | 2 | List of methods on the service |
| `MethodDescriptorProto.name` | 1 | Method name |
| `MethodDescriptorProto.input_type` | 2 | Fully-qualified request type |
| `MethodDescriptorProto.output_type` | 3 | Fully-qualified response type |
| `MethodDescriptorProto.client_streaming` | 5 | Whether the client streams |
| `MethodDescriptorProto.server_streaming` | 6 | Whether the server streams |

Unknown fields present in the real binary (message types, enums, options, etc.)
are safely ignored by protobuf during decoding.
