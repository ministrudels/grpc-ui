# grpc-ui

A desktop gRPC client — similar to Insomnia or Postman, but for gRPC. Built with Electron, React, and TypeScript.

## What it does

Point it at any running gRPC server that has **server reflection** enabled and it will automatically discover all available services and methods, no proto files required.

- **Add Collection** — enter a server URL (e.g. `localhost:50051`), the app queries the server's reflection endpoint and populates the sidebar with a tree of services and methods.
- **Sidebar** — browse discovered collections. Each entry expands into services and their individual RPC methods.
- **Request / Response panels** — (in progress) compose and send requests, view responses.

Server reflection v1alpha and v1 are both supported with automatic fallback, so the app works against both older and modern gRPC server frameworks.

## Prerequisites

- Node.js
- npm

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

Starts the Vite dev server and Electron together with hot reload for the renderer.

## Production build

```bash
npm start
```

Builds the renderer (Vite) and main process (TypeScript), then launches Electron.

## Test

```bash
npm test
```

Runs the integration test suite with Vitest. Tests spin up a real in-process gRPC server to verify the reflection client end-to-end.

## Project structure

```
src/
  main.ts              # Electron main process
  preload.ts           # Context bridge (IPC surface exposed to renderer)
  reflection-client.ts # gRPC server reflection logic
  proto/               # Reflection and descriptor proto definitions (see proto/README.md)
  renderer/
    App.tsx            # Root layout
    components/        # Sidebar, AddressBar, RequestBody, ResponsePanel
  __tests__/           # Integration tests
```
