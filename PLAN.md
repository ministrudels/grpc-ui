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

- [x] 14. Track selected method in `App.tsx` state as `{ collectionUrl: string; serviceName: string; methodName: string } | null`
- [x] 15. Pass an `onSelectMethod` callback down from `App` → `Sidebar` → method items
- [x] 16. Highlight the active method in the sidebar (distinct background/color)
- [x] 17. Show a "Select a method to get started" placeholder in the centre panels when nothing is selected
- [x] 18. Render the Request and Response panels only when a method is selected

## Phase 4 — Prepopulate address bar and request body

- [x] 19. Extend `descriptor.proto` to capture `DescriptorProto` (message fields: name, number, type, label)
- [x] 20. Store parsed message definitions alongside services in the `Collection` type
- [x] 21. When a method is selected, populate the address-bar input with the collection's URL
- [x] 22. Generate a skeleton JSON request body from the method's input-message field definitions and display it in the request editor

## Phase 5 — Send request & display response

- [x] 23. Add IPC channel `grpc:send-request` in `main.ts` that accepts `{ url, service, method, requestJson }`
- [x] 24. Expose `window.grpcui.sendRequest(...)` in `preload.ts`
- [x] 25. In `main.ts`, build a dynamic proto descriptor from the stored `FileDescriptorProto` bytes and call the selected method via `@grpc/grpc-js` (unary MVP)
- [x] 26. Implement Send button in the Request panel; disable while a call is in-flight; show a loading indicator
- [x] 27. Display the response JSON in the Response panel on success
- [x] 28. Display errors (gRPC status code + message) in the Response panel on failure
- [x] 29. Add a 30-second deadline to all request calls

## Phase 6 — Polish (stretch)

- [x] 30. Pretty-print request/response JSON with syntax highlighting
- [ ] 31. Allow editing request metadata / headers
- [ ] 32. Support client-streaming, server-streaming, and bidirectional-streaming RPCs
- [ ] 33. Allow renaming or deleting a collection from the sidebar
- [x] 34. Colour-code kinds of gRPC methods (unary, client-streaming, server-streaming, bidi-streaming) in the sidebar
- [x] 35. Use a syntax-highlighting code editor component instead of a plain `<textarea>` for request bodies
- [x] 36. End to end tests for sending requests and displaying responses (mock gRPC server in test fixture that serves canned responses based on request content). This is a big task and can be deferred until after the MVP is stable.
- [x] 37. Add keyboard shortcut cmd + enter to send request
- [x] 38. Add "Copy response to clipboard" button in the Response panel
- [x] 39. When hovering over add Collection, highlight the button
- [x] 40. Add a trash icon next to each collection in the sidebar; clicking it prompts "Are you sure you want to delete this collection?" and if confirmed, deletes the collection and all its data
- [ ] 41. Plan how to distribute the app via brew and/or as a downloadable binary from GitHub releases
- [x] 42. Add Cancel send button that cancels the in-flight gRPC call.