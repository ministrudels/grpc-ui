# grpc-ui

A desktop gRPC client — similar to Insomnia or Postman, but for gRPC. Built with Electron, React, and TypeScript.

## What it does

Point it at any running gRPC server that has **server reflection** enabled and it will automatically discover all available services and methods, no proto files required.

- **Add Collection** — enter a server URL (e.g. `localhost:50051`), the app queries the server's reflection endpoint and populates the sidebar with a tree of services and methods.
- **Sidebar** — browse discovered collections. Each entry expands into services and their individual RPC methods. Resync a collection at any time to pick up schema changes.
- **Request panel** — select a method and a skeleton JSON request body is auto-generated from the protobuf message definition. Edit it and hit **Send** (or `⌘Enter`).
- **Response panel** — displays the response JSON on success, or the gRPC status and error message on failure.

Server reflection v1alpha and v1 are both supported with automatic fallback, so the app works against both older and modern gRPC server frameworks. Cross-package protobuf dependencies (enums, nested message types from imported files) are fully resolved during reflection.

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

## Tests

### Unit / integration

```bash
npm test
```

Runs the integration test suite with Vitest. Tests spin up a real in-process gRPC server to verify the reflection client end-to-end.

### End-to-end

```bash
npm run e2e
```

Builds the app then runs Playwright tests against the real Electron window.

```bash
npm run e2e:ui
```

Same, but opens the Playwright interactive UI for step-through debugging.

## Developer tools

```bash
npm run dump-storage
```

Reads the app's localStorage (LevelDB) and writes a dated JSON file to `storage-dumps/`. Useful for inspecting what collections and file descriptors are persisted. **The app must not be running** when this is executed.

## Project structure

```text
src/
  main.ts          # Electron main process + IPC handlers
  preload.ts       # Context bridge (IPC surface exposed to renderer)
  grpc-client.ts   # gRPC server reflection and request sending
  proto/           # Reflection and descriptor proto definitions
  renderer/
    App.tsx        # Root layout and send-request logic
    components/    # Sidebar, Collection, Service, Method,
                   # AddressBar, RequestBody, ResponsePanel
  __tests__/       # Integration tests
e2e/               # Playwright end-to-end tests
scripts/
  dump-storage.js  # Dev tool: inspect localStorage contents
```
