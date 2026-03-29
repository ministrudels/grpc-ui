# grpc-ui Implementation Plan

## Phase 1 — Project scaffolding & layout

- [x] 1. Scaffold Electron + React + TypeScript + Vite project
- [x] 2. Add `.gitignore` for TypeScript/Node/Electron
- [x] 3. Implement three-panel layout: Sidebar | Request | Response
- [x] 4. Wire up Electron main process, preload context bridge, and renderer entry point

## Phase 2 — gRPC server reflection & collection management

- [x] 5. Write integration tests for `discoverServices` (v1-only, v1alpha-only, no-reflection groups)
- [x] 6. Implement `discoverServices` in `src/reflection-client.ts` using gRPC server reflection
- [x] 7. Store reflection proto files in `src/proto/` with documentation in `src/proto/README.md`
- [x] 8. Wire `discoverServices` to Electron IPC channel `grpc:connect-server`
- [x] 9. Expose `window.grpcui.connectServer(url)` via `preload.ts` context bridge
- [x] 10. Add v1alpha → v1 fallback for modern servers (UNIMPLEMENTED code 12 triggers retry)
- [x] 11. Add 10-second deadline to all reflection calls (prevent infinite spinner)
- [x] 12. Prompt user for a collection name when adding a server
- [x] 13. Persist collections to `localStorage` so they survive app reloads

## Phase 3 — Method selection

- [ ] 14. Track selected method in `App.tsx` state as `{ collectionUrl: string; serviceName: string; methodName: string } | null`
- [ ] 15. Pass an `onSelectMethod` callback down from `App` → `Sidebar` → method items
- [ ] 16. Highlight the active method in the sidebar (distinct background/color)
- [ ] 17. Show a "Select a method to get started" placeholder in the centre panels when nothing is selected
- [ ] 18. Render the Request and Response panels only when a method is selected

## Phase 4 — Prepopulate address bar and request body

- [ ] 19. Extend `descriptor.proto` to capture `DescriptorProto` (message fields: name, number, type, label)
- [ ] 20. Store parsed message definitions alongside services in the `Collection` type
- [ ] 21. When a method is selected, populate the address-bar input with the collection's URL
- [ ] 22. Generate a skeleton JSON request body from the method's input-message field definitions and display it in the request editor

## Phase 5 — Send request & display response

- [ ] 23. Add IPC channel `grpc:send-request` in `main.ts` that accepts `{ url, service, method, requestJson }`
- [ ] 24. Expose `window.grpcui.sendRequest(...)` in `preload.ts`
- [ ] 25. In `main.ts`, build a dynamic proto descriptor from the stored `FileDescriptorProto` bytes and call the selected method via `@grpc/grpc-js` (unary MVP)
- [ ] 26. Implement Send button in the Request panel; disable while a call is in-flight; show a loading indicator
- [ ] 27. Display the response JSON in the Response panel on success
- [ ] 28. Display errors (gRPC status code + message) in the Response panel on failure
- [ ] 29. Add a 30-second deadline to all request calls

## Phase 6 — Polish (stretch)

- [ ] 30. Pretty-print request/response JSON with syntax highlighting
- [ ] 31. Allow editing request metadata / headers
- [ ] 32. Support client-streaming, server-streaming, and bidirectional-streaming RPCs
- [ ] 33. Allow renaming or deleting a collection from the sidebar
