# grpc-ui Development Plan

A gRPC client application built with Electron + React, similar to Insomnia and Postman.

## Layout

```
------------------------------------------------------------------------------------------------------------------------
| Sidebar for navigating between requests     | Address bar                                 |Button to send the request|
|                                             |------------------------------------------------------------------------|
|                                             | Space to type the bodies for grpcs          | Response                 |
|                                             |                                             |                          |
|                                             |                                             |                          |
|                                             |                                             |                          |
|                                             |                                             |                          |
|                                             |                                             |                          |
------------------------------------------------------------------------------------------------------------------------
```

---

## Phase 1: Layout Components

**1.** Add a UI bundler/build pipeline (Vite + React) to enable component-based development within the Electron app, replacing the bare HTML approach.

**2.** Create the three-panel shell layout:
- Left: `Sidebar` component (fixed width ~240px)
- Right top: `AddressBar` component + `SendButton`
- Right bottom-left: `RequestBody` panel
- Right bottom-right: `ResponsePanel`

**3.** Fill each panel with placeholder text labeling its purpose and apply minimal dark-theme styling consistent with the existing color scheme.

---

## Phase 2: Add Collection via Server Reflection

**4.** Add an "Add Collection" button at the top of the Sidebar.

**5.** Build a `AddCollectionDialog` modal with a single URL input field (e.g. `localhost:50051`).

**6.** On submission, send the URL to the Electron main process via IPC (`ipcRenderer` → `ipcMain`).

**7.** In the main process, install and use `@grpc/grpc-js` + `@grpc/proto-loader` with the gRPC Server Reflection protocol (`grpc.reflection.v1alpha`) to connect to the target server.

**8.** Query the reflection service: call `ListServices` to get all service names, then `FileContainingSymbol` for each service to retrieve the full protobuf file descriptors.

**9.** Parse the descriptors to extract each service's methods (name, request type, response type, streaming mode).

**10.** Send the structured collection data back to the renderer process via IPC response.

**11.** Store the collection in app state and render it in the Sidebar as a tree: collection name (the URL) → service names → method names.
