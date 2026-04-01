# Lessons

Hard-won lessons from building this project. Ordered by when they were learned.

---

## Electron & IPC

**The main process is not hot-reloaded in dev mode.**
`npm run dev` compiles the main process once at startup (`tsc -p tsconfig.main.json`) then launches Electron. Vite only reloads the renderer. Any change to `src/main.ts` or `src/grpc-client.ts` requires a full restart. We shipped a broken cancel button because of this — it appeared to do nothing because the old compiled binary didn't have the `ipcMain.on('grpc:cancel-request')` handler at all.
→ **Rule:** After touching main process code, always restart `npm run dev`. Write an E2E test immediately so the bug surfaces in CI even if missed locally.

**Electron wraps IPC rejections with a prefix.**
When `ipcMain.handle` rejects, the renderer receives `Error invoking remote method 'channel-name': Error: original message`. String comparisons like `=== "Cancelled"` silently fail. Always use `.includes()`.

**`ipcMain.handle` can push mid-flight events with `event.sender.send()`.**
`handle` returns a single Promise but the sender reference stays live during execution. Used for reflection progress: the handler awaits `discoverServices(url, onProgress)` while pushing `grpc:reflect-progress` events for every stage.

**For cancel/abort: use an AbortController in module scope.**
Store it as `let currentRequestAbort: AbortController | null`. The `handle` creates one, `ipcMain.on` for the cancel channel calls `.abort()`. Guard `client.close()` with a `closeOnce()` flag — the gRPC callback and the abort handler can both fire and both try to close.

---

## gRPC Server Reflection

**Dependency chasing must happen three ways.**
When reflection returns a `FileDescriptorProto`, you must chase:
1. `fileContainingSymbol` for each service name from `listServices`
2. `fileContainingSymbol` for TYPE_MESSAGE **and TYPE_ENUM** field types (TYPE_ENUM was missing — caused `resolveAll()` failures on real servers with cross-package enums)
3. `fileByFilename` for explicit `dependency` entries in the proto file (some servers don't include transitive deps in their responses)

Miss any one of these and `resolveAll()` fails with a missing type error when you try to send a request.

**`Root.fromDescriptor()` calls `resolveAll()` internally.**
It's not a separate step — the throw happens inside `fromDescriptor` and the fully-built root is lost. Fix: temporarily patch `Root.prototype.resolveAll` to swallow `"unresolvable extensions"` errors for the duration of the call, then restore it in `finally`.

**`extend .google.protobuf.EnumValueOptions` will always fail to resolve.**
Servers annotating enum values with custom options (a common pattern) produce descriptors that reference `google.protobuf.EnumValueOptions` from `descriptor.proto`. Servers don't serve `descriptor.proto` via reflection — it's a well-known type assumed available everywhere. These extensions are metadata annotations and don't affect wire encoding. Safe to ignore.

**Reflection is recursive and non-linear.**
The pending counter can go **up** as files are processed (each file may reveal new imports). `filesFetched` can jump by more than 1 in a single response. There is no known total upfront — the graph expands until all dependencies are resolved.

---

## Protobuf / protobufjs

**`Root.fromDescriptor()` takes a `FileDescriptorSet`, not individual `FileDescriptorProto` bytes.**
To build a root dynamically, encode each base64 blob as field 1 (tag `0x0a`, wire type 2) into a binary `FileDescriptorSet`, then pass that to `fromDescriptor`.

**Enum values round-trip as numbers over the wire.**
proto3 encodes enums as `int32`. When decoded with `{ enums: String }` in `protoLoader` but plain `{ defaults: true, arrays: true }` in protobufjs's `toObject`, enum fields come back as numbers. Test assertions should use `expect.any(Number)` or decode accordingly.

---

## Playwright + Electron

**`localStorage` is inaccessible until the window has a real origin.**
In dev mode, Electron loads `http://localhost:5173`. In tests, that server isn't running, so the window lands on `about:blank` — `localStorage` throws. Fix: set `PLAYWRIGHT=1` env var and branch in `main.ts` to load the built `dist/renderer/index.html` instead.

**`ipcMain.evaluate()` lets tests replace IPC handlers mid-test.**
Use `app.evaluate(({ ipcMain }) => { ipcMain.removeHandler('...'); ipcMain.handle('...', () => new Promise(() => {})); })` to inject a hanging handler and assert mid-flight UI state (disabled buttons, loading overlays, cancel button visibility).

**Vitest picks up Playwright test files if not excluded.**
Playwright's `test.describe()` throws when vitest loads it. Add `exclude: ["e2e/**"]` to `vitest.config.ts`. The two runners are entirely separate: `npm test` → vitest, `npm run e2e` → Playwright.

**`npm run e2e` rebuilds before running.**
Don't call it from CI after already building — the build runs twice. In CI, run the build step once explicitly, then call `npx playwright test` directly.

---

## React / UI

**`overflow-y: auto` clips absolutely-positioned children regardless of z-index.**
It creates a new stacking and clipping context. Tooltips or popovers inside a scrollable sidebar will be clipped. Fix: React portal rendered into `document.body` with `position: fixed` and `getBoundingClientRect` for positioning.

**Monaco Editor needs `vite-plugin-monaco-editor` to handle web workers.**
Without it, Vite doesn't know how to bundle Monaco's workers and the editor fails to initialise. CodeMirror 6 works out of the box with Vite and is a lighter alternative if Monaco is overkill.

---

## LevelDB / localStorage

**Chromium's localStorage LevelDB key format:**
- Key: `_<origin>\x00\x01<jsKey>` (UTF-8, not UTF-16)
- Value: `\x01<utf8-json>` (1-byte version prefix)
- Meta entries start with `META` or `VERSION` — skip them

The encoding looks like garbled Chinese characters if you misread it as UTF-16 LE. It's UTF-8.

**The app must not be running when reading the LevelDB.**
Chromium holds an exclusive lock on the LevelDB. `classic-level` will fail to open if the app is open.

---

## TypeScript

**`noUnusedLocals` / `noUnusedParameters` should be on from the start.**
Easier to keep clean than to enable later and fix a backlog. React imports (`import React from 'react'`) are unnecessary with the `react-jsx` automatic runtime — enabling these flags flushes them out.

**Separate `tsconfig` files for different entry points.**
Main process, renderer, and e2e tests each have different globals and module resolution needs. `tsconfig.main.json` targets Node, `tsconfig.json` targets the browser renderer, `tsconfig.e2e.json` covers `e2e/**`.
