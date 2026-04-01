import React, { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import AddressBar from "./components/AddressBar";
import RequestBody from "./components/RequestBody";
import ResponsePanel from "./components/ResponsePanel";
import Snackbar from "./components/Snackbar";
import type { GrpcField, GrpcMessage, GrpcMethod, GrpcService, NamedCollection } from "./global";
import type { OnSelectMethod } from "./components/Sidebar";

export type { NamedCollection };

export type SelectedMethod = {
  collectionUrl: string;
  service: GrpcService;
  method: GrpcMethod;
};

const STORAGE_KEY = "grpcui:collections";

function loadCollections(): NamedCollection[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as NamedCollection[]) : [];
  } catch {
    return [];
  }
}

function saveCollections(collections: NamedCollection[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
}

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
    case "TYPE_STRING":
      return "";
    case "TYPE_BOOL":
      return false;
    case "TYPE_BYTES":
      return "";
    case "TYPE_DOUBLE":
    case "TYPE_FLOAT":
    case "TYPE_INT32":
    case "TYPE_INT64":
    case "TYPE_UINT32":
    case "TYPE_UINT64":
    case "TYPE_SINT32":
    case "TYPE_SINT64":
    case "TYPE_FIXED32":
    case "TYPE_FIXED64":
    case "TYPE_SFIXED32":
    case "TYPE_SFIXED64":
    case "TYPE_ENUM":
      return 0;
    case "TYPE_MESSAGE":
      return buildSkeleton(field.typeName, messages, visited);
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: "flex",
    height: "100vh",
    background: "#1a1a1a",
    color: "#e2e2e2"
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0
  },
  topRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderBottom: "1px solid #2d2d2d",
    flexShrink: 0
  },
  panels: {
    flex: 1,
    display: "flex",
    minHeight: 0
  },
  placeholder: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#4a4a4a",
    fontSize: 14
  }
};

export default function App() {
  const [collections, setCollections] = useState<NamedCollection[]>(loadCollections);
  const [selectedMethod, setSelectedMethod] = useState<SelectedMethod | null>(null);
  const [requestBody, setRequestBody] = useState("");
  const [response, setResponse] = useState<unknown>(null);
  const [responseError, setResponseError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [snackbar, setSnackbar] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });
  const snackbarTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!sending) { setElapsed(0); return; }
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 250);
    return () => clearInterval(id);
  }, [sending]);

  function showSnackbar(message: string) {
    if (snackbarTimer.current) clearTimeout(snackbarTimer.current);
    setSnackbar({ message, visible: true });
    snackbarTimer.current = setTimeout(() => setSnackbar((s) => ({ ...s, visible: false })), 2500);
  }

  function handleCollectionsChange(next: NamedCollection[]) {
    saveCollections(next);
    setCollections(next);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.key === "Enter" && e.metaKey)) return;
      if (!selectedMethod) {
        showSnackbar("Select a method before sending");
      } else if (sending) {
        showSnackbar("A request is already in flight");
      } else {
        handleSend();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const handleSelectMethod: OnSelectMethod = (collectionUrl, service, method, messages) => {
    setSelectedMethod({ collectionUrl, service, method });
    setResponse(null);
    setResponseError(null);
    const skeleton = buildSkeleton(method.requestType, messages);
    setRequestBody(JSON.stringify(skeleton, null, 2));
  };

  async function handleSend() {
    if (!selectedMethod || sending) return;
    const col = collections.find((c) => c.url === selectedMethod.collectionUrl);
    if (!col?.fileDescriptors?.length) {
      setResponseError("No schema available — resync the collection first.");
      return;
    }
    setSending(true);
    setResponse(null);
    setResponseError(null);
    try {
      const res = await window.grpcui.sendRequest({
        url: selectedMethod.collectionUrl,
        serviceName: selectedMethod.service.name,
        methodName: selectedMethod.method.name,
        requestType: selectedMethod.method.requestType,
        responseType: selectedMethod.method.responseType,
        requestJson: requestBody,
        fileDescriptors: col.fileDescriptors
      });
      setResponse(res);
    } catch (err: unknown) {
      const msg = (err as Error).message ?? "Request failed";
      setResponseError(msg.includes("Cancelled") ? "Request cancelled." : msg);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={styles.app}>
      <Sidebar
        collections={collections}
        onCollectionsChange={handleCollectionsChange}
        selectedMethod={selectedMethod}
        onSelectMethod={handleSelectMethod}
      />
      <div style={styles.main}>
        <div style={styles.topRow}>
          <AddressBar
            url={selectedMethod?.collectionUrl ?? ""}
            canSend={!!selectedMethod && !sending}
            sending={sending}
            elapsed={elapsed}
            onSend={handleSend}
            onCancel={() => window.grpcui.cancelRequest()}
          />
        </div>
        <div style={styles.panels}>
          {selectedMethod ? (
            <>
              <RequestBody value={requestBody} onChange={setRequestBody} />
              <ResponsePanel response={response} error={responseError} loading={sending} />
            </>
          ) : (
            <div style={styles.placeholder}>Select a method from the sidebar to get started</div>
          )}
        </div>
      </div>
      <Snackbar message={snackbar.message} visible={snackbar.visible} />
    </div>
  );
}
