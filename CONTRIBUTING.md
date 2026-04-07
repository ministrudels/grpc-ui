# Contributing to gRPC UI

Contributions are welcome. Please open an issue before starting work on a large feature so we can discuss the approach first.

## Prerequisites

- Node.js 20+
- npm

## Setup

```bash
git clone https://github.com/ministrudels/grpc-ui.git
cd grpc-ui
npm install
npm run dev
```

## Submitting changes

- Keep PRs focused — one feature or fix per PR
- Add or update tests for any changed behavior
- Run `npm test` and `npm run e2e` before opening a PR and make sure both pass
- Write commit messages in the imperative: `fix: correct reflection fallback` not `fixed reflection fallback`

## Reporting bugs

Open an issue with:

- What you did
- What you expected to happen
- What actually happened
- Your OS and app version

## Development

```bash
npm run dev
```

Starts the Vite dev server and Electron together with hot reload for the renderer.

## Running tests

**Unit / integration:**

```bash
npm test
```

Vitest unit tests (proto type mapping, schema generation) and integration tests that spin up a real in-process gRPC server to verify reflection end-to-end.

**End-to-end:**

```bash
npm run e2e      # headless
npm run e2e:ui   # interactive Playwright UI for step-through debugging
```

## Developer tools

```bash
npm run dump-storage
```

Reads the app's localStorage (LevelDB) and writes a dated JSON file to `storage-dumps/`. Useful for inspecting persisted collections and file descriptors. The app must not be running when this is executed.