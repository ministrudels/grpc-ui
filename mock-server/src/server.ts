import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { ReflectionService } from "@grpc/reflection";
import path from "path";

const PROTO_PATH = path.join(__dirname, "../proto/mock.proto");
const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_PORT = 50051;

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  available: boolean;
};

type OrderItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
};

type Order = {
  id: string;
  customerName: string;
  items: OrderItem[];
  status: string;
  total: number;
};

type GetProductRequest = { id?: string };
type CreateProductRequest = { name?: string; category?: string; price?: number; stock?: number };
type ListProductsRequest = { categoryFilter?: string; pageSize?: number };
type WatchProductUpdatesRequest = { categoryFilter?: string; intervalMs?: number; count?: number };
type ProductUpdate = {
  updateId: string;
  type: string;
  product: Product;
  sequence: number;
  message: string;
};

type GetOrderRequest = { id?: string };
type CreateOrderRequest = { customerName?: string; items?: OrderItem[] };
type ListOrdersRequest = { statusFilter?: string };
type WatchOrderUpdatesRequest = { orderId?: string; intervalMs?: number; count?: number };
type OrderUpdate = {
  updateId: string;
  orderId: string;
  status: string;
  sequence: number;
  message: string;
};

type ServiceWithDefinition = {
  service: grpc.ServiceDefinition<grpc.UntypedServiceImplementation>;
};

type LoadedMockPackage = {
  mock: {
    shop: {
      ProductCatalog: ServiceWithDefinition;
      OrderService: ServiceWithDefinition;
    };
  };
};

export type MockServerOptions = {
  host?: string;
  port?: number;
};

export type RunningMockServer = {
  server: grpc.Server;
  host: string;
  port: number;
};

const products: Product[] = [
  { id: "product-1", name: "Coffee Beans", category: "grocery", price: 12.5, stock: 42, available: true },
  { id: "product-2", name: "Desk Lamp", category: "home", price: 34.99, stock: 16, available: true },
  { id: "product-3", name: "Notebook", category: "office", price: 4.5, stock: 120, available: true },
  { id: "product-4", name: "Water Bottle", category: "outdoors", price: 18, stock: 0, available: false }
];

const orders: Order[] = [
  {
    id: "order-1",
    customerName: "Alex Morgan",
    items: [{ productId: "product-1", productName: "Coffee Beans", quantity: 2, unitPrice: 12.5 }],
    status: "PLACED",
    total: 25
  },
  {
    id: "order-2",
    customerName: "Jamie Lee",
    items: [{ productId: "product-2", productName: "Desk Lamp", quantity: 1, unitPrice: 34.99 }],
    status: "PACKED",
    total: 34.99
  },
  {
    id: "order-3",
    customerName: "Taylor Kim",
    items: [
      { productId: "product-3", productName: "Notebook", quantity: 3, unitPrice: 4.5 },
      { productId: "product-4", productName: "Water Bottle", quantity: 1, unitPrice: 18 }
    ],
    status: "SHIPPED",
    total: 31.5
  }
];

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

function clampPrice(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.round(parsed * 100) / 100;
}

function makeGeneratedProduct(id: string): Product {
  return {
    id,
    name: `Generated product ${id}`,
    category: "misc",
    price: 9.99,
    stock: 10,
    available: true
  };
}

function getProduct(
  call: grpc.ServerUnaryCall<GetProductRequest, Product>,
  callback: grpc.sendUnaryData<Product>
): void {
  const id = call.request.id || "product-1";
  const product = products.find((item) => item.id === id) || makeGeneratedProduct(id);
  callback(null, product);
}

function createProduct(
  call: grpc.ServerUnaryCall<CreateProductRequest, Product>,
  callback: grpc.sendUnaryData<Product>
): void {
  const stock = clampNumber(call.request.stock, 10, 0, 10000);
  const product = {
    id: `product-${products.length + 1}`,
    name: call.request.name || "New Product",
    category: call.request.category || "misc",
    price: clampPrice(call.request.price, 9.99),
    stock,
    available: stock > 0
  };
  products.push(product);
  callback(null, product);
}

function listProducts(
  call: grpc.ServerUnaryCall<ListProductsRequest, { products: Product[]; nextPageToken: string }>,
  callback: grpc.sendUnaryData<{ products: Product[]; nextPageToken: string }>
): void {
  const categoryFilter = (call.request.categoryFilter || "").toLowerCase();
  const filtered = categoryFilter
    ? products.filter((product) => product.category.toLowerCase() === categoryFilter)
    : products;
  const pageSize = clampNumber(call.request.pageSize, filtered.length || 1, 1, Math.max(filtered.length, 1));

  callback(null, {
    products: filtered.slice(0, pageSize),
    nextPageToken: filtered.length > pageSize ? "next-products-page" : ""
  });
}

function watchProductUpdates(call: grpc.ServerWritableStream<WatchProductUpdatesRequest, ProductUpdate>): void {
  const categoryFilter = (call.request.categoryFilter || "").toLowerCase();
  const visibleProducts = categoryFilter
    ? products.filter((product) => product.category.toLowerCase() === categoryFilter)
    : products;
  const streamProducts = visibleProducts.length ? visibleProducts : products;
  const count = clampNumber(call.request.count, 5, 1, 20);
  const intervalMs = clampNumber(call.request.intervalMs, 750, 100, 5000);
  const updateTypes = ["PRICE_CHANGED", "STOCK_CHANGED", "BACK_IN_STOCK", "FEATURED"];
  let sequence = 0;
  let timer: NodeJS.Timeout | null = null;

  function finish(): void {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function emit(): void {
    if (call.cancelled) {
      finish();
      return;
    }

    const product = streamProducts[sequence % streamProducts.length];
    const type = updateTypes[sequence % updateTypes.length];
    call.write({
      updateId: `product-update-${sequence + 1}`,
      type,
      product,
      sequence: sequence + 1,
      message: `${product.name}: ${type.toLowerCase().replace(/_/g, " ")}`
    });

    sequence += 1;
    if (sequence >= count) {
      finish();
      call.end();
    }
  }

  call.on("cancelled", finish);
  call.on("error", finish);

  emit();
  if (sequence < count) {
    timer = setInterval(emit, intervalMs);
  }
}

function calculateOrderTotal(items: OrderItem[]): number {
  const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  return Math.round(total * 100) / 100;
}

function getOrder(call: grpc.ServerUnaryCall<GetOrderRequest, Order>, callback: grpc.sendUnaryData<Order>): void {
  const id = call.request.id || "order-1";
  const order = orders.find((item) => item.id === id);

  if (order) {
    callback(null, order);
    return;
  }

  callback(null, {
    id,
    customerName: "Demo Customer",
    items: [{ productId: "product-1", productName: "Coffee Beans", quantity: 1, unitPrice: 12.5 }],
    status: "PLACED",
    total: 12.5
  });
}

function createOrder(call: grpc.ServerUnaryCall<CreateOrderRequest, Order>, callback: grpc.sendUnaryData<Order>): void {
  const items = call.request.items?.length
    ? call.request.items.map((item) => ({
      productId: item.productId || "product-1",
      productName: item.productName || "Coffee Beans",
      quantity: clampNumber(item.quantity, 1, 1, 99),
      unitPrice: clampPrice(item.unitPrice, 12.5)
    }))
    : [{ productId: "product-1", productName: "Coffee Beans", quantity: 1, unitPrice: 12.5 }];

  const order = {
    id: `order-${orders.length + 1}`,
    customerName: call.request.customerName || "Demo Customer",
    items,
    status: "PLACED",
    total: calculateOrderTotal(items)
  };
  orders.push(order);
  callback(null, order);
}

function listOrders(
  call: grpc.ServerUnaryCall<ListOrdersRequest, { orders: Order[] }>,
  callback: grpc.sendUnaryData<{ orders: Order[] }>
): void {
  const statusFilter = (call.request.statusFilter || "").toUpperCase();
  callback(null, {
    orders: statusFilter
      ? orders.filter((order) => order.status === statusFilter)
      : orders
  });
}

function watchOrderUpdates(call: grpc.ServerWritableStream<WatchOrderUpdatesRequest, OrderUpdate>): void {
  const orderId = call.request.orderId || "order-1";
  const count = clampNumber(call.request.count, 6, 1, 25);
  const intervalMs = clampNumber(call.request.intervalMs, 600, 100, 5000);
  const statuses = ["PLACED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];
  let sequence = 0;
  let timer: NodeJS.Timeout | null = null;

  function finish(): void {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function emit(): void {
    if (call.cancelled) {
      finish();
      return;
    }

    const status = statuses[Math.min(sequence, statuses.length - 1)];
    call.write({
      updateId: `order-update-${sequence + 1}`,
      orderId,
      status,
      sequence: sequence + 1,
      message: `Order ${orderId} is now ${status.toLowerCase().replace(/_/g, " ")}`
    });

    sequence += 1;
    if (sequence >= count) {
      finish();
      call.end();
    }
  }

  call.on("cancelled", finish);
  call.on("error", finish);

  emit();
  if (sequence < count) {
    timer = setInterval(emit, intervalMs);
  }
}

function loadMockPackage(): { packageDefinition: protoLoader.PackageDefinition; packageObject: LoadedMockPackage } {
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  });

  return {
    packageDefinition,
    packageObject: grpc.loadPackageDefinition(packageDefinition) as unknown as LoadedMockPackage
  };
}

export function startMockServer(options: MockServerOptions = {}): Promise<RunningMockServer> {
  const host = options.host ?? DEFAULT_HOST;
  const port = options.port ?? DEFAULT_PORT;
  const { packageDefinition, packageObject } = loadMockPackage();
  const server = new grpc.Server();

  server.addService(packageObject.mock.shop.ProductCatalog.service, {
    getProduct,
    createProduct,
    listProducts,
    watchProductUpdates
  });

  server.addService(packageObject.mock.shop.OrderService.service, {
    getOrder,
    createOrder,
    listOrders,
    watchOrderUpdates
  });

  const reflection = new ReflectionService(packageDefinition);
  reflection.addToServer(server);

  return new Promise((resolve, reject) => {
    server.bindAsync(`${host}:${port}`, grpc.ServerCredentials.createInsecure(), (error, boundPort) => {
      if (error) {
        reject(error);
        return;
      }

      resolve({ server, host, port: boundPort });
    });
  });
}

function readFlagValue(argv: string[], flag: string): string | undefined {
  const flagIndex = argv.indexOf(flag);
  if (flagIndex >= 0) return argv[flagIndex + 1];
  return argv.find((arg) => arg.startsWith(`${flag}=`))?.slice(flag.length + 1);
}

function parsePort(argv: string[]): number {
  return clampNumber(readFlagValue(argv, "--port") || process.env.PORT, DEFAULT_PORT, 0, 65535);
}

function parseHost(argv: string[]): string {
  return readFlagValue(argv, "--host") || process.env.HOST || DEFAULT_HOST;
}

if (require.main === module) {
  const argv = process.argv.slice(2);
  const host = parseHost(argv);
  const port = parsePort(argv);

  startMockServer({ host, port })
    .then(({ server, host: boundHost, port: boundPort }) => {
      console.log(`Mock gRPC server listening on ${boundHost}:${boundPort}`);
      console.log(`Use this address in gRPC UI: localhost:${boundPort}`);
      console.log("Reflection is enabled for mock.shop.ProductCatalog and mock.shop.OrderService");

      function shutdown(): void {
        server.tryShutdown((error) => {
          if (error) {
            server.forceShutdown();
          }
          process.exit(error ? 1 : 0);
        });
      }

      process.once("SIGINT", shutdown);
      process.once("SIGTERM", shutdown);
    })
    .catch((error: Error) => {
      console.error("Failed to start mock gRPC server:", error.message);
      process.exit(1);
    });
}
