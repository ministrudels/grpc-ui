import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import AddressBar from "./components/AddressBar";
import RequestBody from "./components/RequestBody";
import ResponsePanel from "./components/ResponsePanel";
import type { GrpcField, GrpcMessage, GrpcMethod, GrpcService } from "./global";
import type { OnSelectMethod } from "./components/Sidebar";

export type SelectedMethod = {
  collectionUrl: string;
  service: GrpcService;
  method: GrpcMethod;
};

// ── Skeleton JSON generation ──────────────────────────────────────────────────

function buildSkeleton(
  typeName: string,
  messages: GrpcMessage[],
  visited = new Set<string>()
): Record<string, unknown> {
  if (visited.has(typeName)) return {};
  visited.add(typeName);
  const msg = messages.find((m) => m.name === typeName);
  if (!msg) return {};
  const result: Record<string, unknown> = {};
  for (const field of msg.fields) {
    result[field.name] = field.repeated ? [] : fieldDefault(field, messages, visited);
  }
  return result;
}

function fieldDefault(field: GrpcField, messages: GrpcMessage[], visited: Set<string>): unknown {
  switch (field.type) {
    case "TYPE_STRING": return "";
    case "TYPE_BOOL":   return false;
    case "TYPE_BYTES":  return "";
    case "TYPE_DOUBLE": case "TYPE_FLOAT":
    case "TYPE_INT32":  case "TYPE_INT64":
    case "TYPE_UINT32": case "TYPE_UINT64":
    case "TYPE_SINT32": case "TYPE_SINT64":
    case "TYPE_FIXED32": case "TYPE_FIXED64":
    case "TYPE_SFIXED32": case "TYPE_SFIXED64":
    case "TYPE_ENUM":   return 0;
    case "TYPE_MESSAGE": return buildSkeleton(field.typeName, messages, visited);
    default:            return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: "flex",
    height: "100vh",
    background: "#1a1a1a",
    color: "#e2e2e2",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  topRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderBottom: "1px solid #2d2d2d",
    flexShrink: 0,
  },
  panels: {
    flex: 1,
    display: "flex",
    minHeight: 0,
  },
  placeholder: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#4a4a4a",
    fontSize: 14,
  },
};

export default function App() {
  const [selectedMethod, setSelectedMethod] = useState<SelectedMethod | null>(null);
  const [requestBody, setRequestBody] = useState("");

  const handleSelectMethod: OnSelectMethod = (collectionUrl, service, method, messages) => {
    setSelectedMethod({ collectionUrl, service, method });
    const skeleton = buildSkeleton(method.requestType, messages);
    setRequestBody(JSON.stringify(skeleton, null, 2));
  };

  return (
    <div style={styles.app}>
      <Sidebar selectedMethod={selectedMethod} onSelectMethod={handleSelectMethod} />
      <div style={styles.main}>
        <div style={styles.topRow}>
          <AddressBar url={selectedMethod?.collectionUrl ?? ""} />
        </div>
        <div style={styles.panels}>
          {selectedMethod ? (
            <>
              <RequestBody value={requestBody} onChange={setRequestBody} />
              <ResponsePanel />
            </>
          ) : (
            <div style={styles.placeholder}>Select a method from the sidebar to get started</div>
          )}
        </div>
      </div>
    </div>
  );
}
