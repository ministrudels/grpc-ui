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
- [x] 29. Add a 30-second deadline to unary request calls

## Phase 6 — Multi-tab UI

- [x] 43. Each selected method opens in its own tab; clicking an already-open method focuses it
- [x] 44. Concurrent requests across tabs (each tab has independent send/cancel/response state)
- [x] 45. Per-tab status indicator (idle / sending / success / error) shown in the tab bar and sidebar method list
- [x] 46. Cancel button per tab; Escape key cancels the active tab's in-flight request
- [x] 47. Elapsed timer in address bar while a request is in-flight
- [x] 48. Fix Cmd+Enter stale-closure bug — listener registered once, reads state from a live ref

## Phase 7 — Streaming RPCs

- [x] 49. Colour-code method kinds (U / SS / CS / BIDI badges) in the sidebar
- [x] 50. Server-streaming support via `makeServerStreamRequest`; messages relayed to renderer via `grpc:stream-data` IPC events
- [x] 51. Streaming response panel: per-message blocks with Monaco syntax highlighting and right-aligned receipt timestamps
- [x] 52. Auto-scroll response panel as streaming messages arrive
- [x] 53. Cancelled/errored streams append a terminal error entry instead of replacing the panel; panel only resets on new send
- [x] 54. Remove deadline from streaming calls (streams live until server closes or user cancels); use `status` event to settle promise reliably
- [ ] 55. Client-streaming RPC support
- [ ] 56. Bidirectional-streaming RPC support

## Phase 8 — Polish & UX

- [x] 30. Pretty-print request/response JSON with syntax highlighting (Monaco editor)
- [x] 31. Request metadata editor (key/value pairs sent as gRPC metadata); toggled via Request/Metadata tabs
- [x] 33. Delete a collection from the sidebar (trash icon with confirmation prompt)
- [x] 34. Colour-code gRPC method kinds in the sidebar
- [x] 35. Monaco editor for request bodies with JSON schema autocomplete
- [x] 36. E2E tests with a real in-process gRPC server (happy path, streaming, cancel)
- [x] 37. Cmd+Enter to send; Escape to cancel
- [x] 38. Copy response to clipboard button in response panel header
- [x] 39. Hover highlight on Add Collection button
- [x] 40. Trash icon per collection with delete confirmation
- [x] 42. Cancel button cancels in-flight gRPC call via AbortController
- [x] 57. Freeze sidebar toolbar (search + add) when scrolling collections
- [x] 58. Sidebar search filters methods; / or Cmd+K focuses search; Escape clears
- [x] 59. Active method auto-scrolls into view in sidebar when switching tabs
- [x] 60. Response panel border spans full panel height for a continuous visual divider

## Phase 9 — Distribution

- [ ] 41. Distribute via Homebrew and/or downloadable binary from GitHub Releases
