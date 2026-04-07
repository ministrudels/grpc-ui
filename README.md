# grpc-ui

A desktop gRPC client — built for developers who want Postman-level ergonomics for gRPC. No proto files, no config files, no plugins. Point it at a server and start sending requests.

Built with Electron, React, and TypeScript.

## Features

### Zero-config schema discovery

Connect to any gRPC server with reflection enabled and grpc-ui automatically discovers every service, method, and message type. Both reflection v1 and v1alpha are supported with automatic fallback, so it works with all major frameworks (grpc-go, grpc-java, grpc-node, tonic, etc.). Cross-package protobuf dependencies — enums, nested types from imported `.proto` files — are fully resolved.

### Monaco-powered request editor

The request body editor is backed by Monaco (the engine behind VS Code). When you select a method, a zero-value JSON skeleton is generated from the proto message definition and dropped into the editor. The editor has full JSON Schema validation and autocomplete driven by the proto schema — field names, types, and nested message shapes are all suggested as you type.

### Request / response at a glance

- Auto-generated skeleton saves you from writing boilerplate
- Send with `⌘Enter` from anywhere in the app, or from inside the editor
- Live elapsed timer while a request is in flight
- Cancel in-flight requests with the Cancel button or `Escape`
- Response panel shows pretty-printed JSON on success, or the gRPC status code and error message on failure

### Sidebar search

Command-palette style fuzzy search across all collections, services, and methods. Characters are matched in order — type `uls` to find `UserListService`.

### Method type badges

Every method is labelled with its streaming type — `U` (unary), `SS` (server streaming), `CS` (client streaming), `BIDI` (bidirectional) — so you always know what you're calling.

### Persistent collections

Collections are saved to localStorage and restored on next launch. Resync any collection at any time to pick up schema changes on the server.

---

## Installation

### macOS (Homebrew — recommended)

```sh
brew tap ministrudels/tap
brew install --cask grpc-ui
```

No Gatekeeper warnings, auto-updates with `brew upgrade`.

### macOS (direct download)

Download `gRPC-UI-<version>-arm64.dmg` (Apple Silicon) or `gRPC-UI-<version>-mac.dmg` (Intel) from the [latest release](https://github.com/ministrudels/grpc-ui/releases/latest).

> **First launch:** right-click the app → **Open** → **Open** to approve it once. macOS will not ask again.

### Windows

Download `gRPC-UI-Setup-<version>.exe` from the [latest release](https://github.com/ministrudels/grpc-ui/releases/latest) and run the installer.

### Linux

**AppImage** (universal):
```sh
chmod +x gRPC-UI-<version>.AppImage
./gRPC-UI-<version>.AppImage
```

**Debian / Ubuntu:**
```sh
sudo dpkg -i grpc-ui_<version>_amd64.deb
```

---

## Contributing

### Prerequisites

- Node.js 20+
- npm

### Setup

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

Vitest unit tests (proto type mapping, schema generation) and integration tests that spin up a real in-process gRPC server to verify reflection end-to-end.

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
    proto.ts       # Proto type → JSON skeleton / JSON Schema
    components/    # Sidebar, Collection, Service, Method,
                   # AddressBar, RequestBody, ResponsePanel
  __tests__/       # Unit and integration tests
e2e/               # Playwright end-to-end tests
scripts/
  dump-storage.js  # Dev tool: inspect localStorage contents
```
