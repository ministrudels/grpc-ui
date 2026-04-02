import React, { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import TabBar from "./components/TabBar";
import AddressBar from "./components/AddressBar";
import RequestBody from "./components/RequestBody";
import MetadataEditor, { type MetadataRow } from "./components/MetadataEditor";
import ResponsePanel from "./components/ResponsePanel";
import Snackbar from "./components/Snackbar";
import type { GrpcMethod, GrpcService, NamedCollection } from "./global";
import { skeletonFromMessage } from "./proto";
import type { OnSelectMethod } from "./components/Sidebar";
import "./app.css";

export type { NamedCollection };


export type TabStatus = "idle" | "sending" | "success" | "error";

export type Tab = {
  id: string;
  collectionUrl: string;
  service: GrpcService;
  method: GrpcMethod;
  requestBody: string;
  metadata: MetadataRow[];
  editorTab: "request" | "metadata";
  response: unknown;
  responseError: string | null;
  sending: boolean;
  elapsed: number;
  status: TabStatus;
};

// SelectedMethod is derived from the active tab; kept for Sidebar compatibility
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

function newTabId(): string {
  return Math.random().toString(36).slice(2, 9);
}

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
  leftPanel: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minWidth: 0,
    minHeight: 0,
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
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });
  const snackbarTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

  // Derived for Sidebar highlight compatibility
  const selectedMethod: SelectedMethod | null = activeTab
    ? { collectionUrl: activeTab.collectionUrl, service: activeTab.service, method: activeTab.method }
    : null;

  function updateTab(id: string, patch: Partial<Tab>) {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  // Elapsed timer — tracks the active tab's in-flight request
  const activeSending = activeTab?.sending ?? false;
  useEffect(() => {
    if (!activeSending || !activeTabId) {
      if (activeTabId) setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, elapsed: 0 } : t)));
      return;
    }
    const start = Date.now();
    const id = setInterval(() => {
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId ? { ...t, elapsed: Math.floor((Date.now() - start) / 1000) } : t
        )
      );
    }, 250);
    return () => clearInterval(id);
  }, [activeSending, activeTabId]);

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
      if (e.key === "Escape" && activeTab?.sending) {
        window.grpcui.cancelRequest(activeTab.id);
        return;
      }
      if (!(e.key === "Enter" && e.metaKey)) return;
      if (!activeTab) {
        showSnackbar("Select a method before sending");
      } else if (activeTab.sending) {
        showSnackbar("A request is already in flight");
      } else {
        handleSend();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const handleSelectMethod: OnSelectMethod = (collectionUrl, service, method, messages) => {
    const existing = tabs.find(
      (t) => t.collectionUrl === collectionUrl && t.service.name === service.name && t.method.name === method.name
    );
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }
    const skeleton = skeletonFromMessage(method.requestType, messages);
    const tab: Tab = {
      id: newTabId(),
      collectionUrl,
      service,
      method,
      requestBody: JSON.stringify(skeleton, null, 2),
      metadata: [],
      editorTab: "request",
      response: null,
      responseError: null,
      sending: false,
      elapsed: 0,
      status: "idle",
    };
    setTabs((prev) => [...prev, tab]);
    setActiveTabId(tab.id);
  };

  function handleCloseTab(id: string) {
    setTabs((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (id === activeTabId) {
        const idx = prev.findIndex((t) => t.id === id);
        const fallback = next[Math.max(0, idx - 1)]?.id ?? next[0]?.id ?? null;
        setActiveTabId(fallback);
      }
      return next;
    });
  }

  async function handleSend() {
    if (!activeTab || activeTab.sending) return;
    const tabId = activeTab.id;
    const col = collections.find((c) => c.url === activeTab.collectionUrl);
    if (!col?.fileDescriptors?.length) {
      updateTab(tabId, { responseError: "No schema available — resync the collection first." });
      return;
    }
    updateTab(tabId, { sending: true, response: null, responseError: null, status: "sending" });
    try {
      const res = await window.grpcui.sendRequest({
        url: activeTab.collectionUrl,
        serviceName: activeTab.service.name,
        methodName: activeTab.method.name,
        requestType: activeTab.method.requestType,
        responseType: activeTab.method.responseType,
        requestJson: activeTab.requestBody,
        fileDescriptors: col.fileDescriptors,
        metadata: activeTab.metadata,
      }, tabId);
      updateTab(tabId, { response: res, status: "success" });
    } catch (err: unknown) {
      const msg = (err as Error).message ?? "Request failed";
      updateTab(tabId, {
        responseError: msg.includes("Cancelled") ? "Request cancelled." : msg,
        status: "error",
      });
    } finally {
      updateTab(tabId, { sending: false });
    }
  }

  return (
    <div style={styles.app}>
      <Sidebar
        collections={collections}
        onCollectionsChange={handleCollectionsChange}
        selectedMethod={selectedMethod}
        onSelectMethod={handleSelectMethod}
        tabStatuses={new Map(tabs.map((t) => [`${t.collectionUrl}|${t.service.name}|${t.method.name}`, t.status]))}
      />
      <div style={styles.main}>
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onSelect={setActiveTabId}
          onClose={handleCloseTab}
        />
        <div style={styles.topRow}>
          <AddressBar
            url={activeTab?.collectionUrl ?? ""}
            canSend={!!activeTab && !activeTab.sending}
            sending={activeTab?.sending ?? false}
            elapsed={activeTab?.elapsed ?? 0}
            onSend={handleSend}
            onCancel={() => activeTab && window.grpcui.cancelRequest(activeTab.id)}
          />
        </div>
        <div style={styles.panels}>
          {activeTab ? (
            <>
              <div style={styles.leftPanel}>
                <div className="editor-tabs">
                  <button
                    className={`editor-tab${activeTab.editorTab === "request" ? " active" : ""}`}
                    onClick={() => updateTab(activeTab.id, { editorTab: "request" })}
                  >
                    Request
                  </button>
                  <button
                    className={`editor-tab${activeTab.editorTab === "metadata" ? " active" : ""}`}
                    onClick={() => updateTab(activeTab.id, { editorTab: "metadata" })}
                  >
                    Metadata
                    {activeTab.metadata.filter((r) => r.key.trim()).length > 0 && (
                      <span className="editor-tab-badge">
                        {activeTab.metadata.filter((r) => r.key.trim()).length}
                      </span>
                    )}
                  </button>
                </div>
                {activeTab.editorTab === "request" ? (
                  <RequestBody
                    value={activeTab.requestBody}
                    onChange={(v) => updateTab(activeTab.id, { requestBody: v })}
                    onSend={handleSend}
                    requestType={activeTab.method.requestType}
                    messages={collections.find((c) => c.url === activeTab.collectionUrl)?.messages}
                  />
                ) : (
                  <MetadataEditor
                    rows={activeTab.metadata}
                    onChange={(rows) => updateTab(activeTab.id, { metadata: rows })}
                  />
                )}
              </div>
              <ResponsePanel
                response={activeTab.response}
                error={activeTab.responseError}
                loading={activeTab.sending}
              />
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
