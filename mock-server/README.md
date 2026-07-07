# gRPC UI mock server

Local reflected gRPC server for developing and demoing gRPC UI.

## Run

From the repository root:

```sh
npm run mock:server
```

Then add `localhost:50051` in gRPC UI.

To use a different port:

```sh
npm run mock:server -- --port 50052
```

## Services

- `mock.shop.ProductCatalog`
  - Unary: `GetProduct`, `CreateProduct`, `ListProducts`
  - Server streaming: `WatchProductUpdates`
- `mock.shop.OrderService`
  - Unary: `GetOrder`, `CreateOrder`, `ListOrders`
  - Server streaming: `WatchOrderUpdates`
