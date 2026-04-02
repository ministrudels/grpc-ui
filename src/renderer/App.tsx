import { useEffect, useRef, useState } from "react";
import Sidebar from "./components/Sidebar";
import TabBar from "./components/TabBar";
import AddressBar from "./components/AddressBar";
import RequestBody from "./components/RequestBody";
import MetadataEditor, { type MetadataRow } from "./components/MetadataEditor";
import ResponsePanel from "./components/ResponsePanel";
import Snackbar from "./components/Snackbar";
import Settings from "./components/Settings";
import type { GrpcMethod, GrpcService, NamedCollection } from "./global";
import { skeletonFromMessage } from "./proto";
import type { OnSelectMethod } from "./components/Sidebar";
import "./app.css";

export type { NamedCollection };

export type Theme = "dark" | "light";

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
  streamTimestamps: number[];
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
const SETTINGS_KEY = "grpcui:settings";

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

function loadTheme(): Theme {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return "dark";
    const settings = JSON.parse(raw) as { theme?: string };
    return settings.theme === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function saveTheme(theme: Theme): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ theme }));
}

function newTabId(): string {
  return Math.random().toString(36).slice(2, 9);
}

export default function App() {
  const [collections, setCollections] = useState<NamedCollection[]>(loadCollections);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ message: string; visible: boolean }>({ message: "", visible: false });
  const snackbarTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Always holds the latest values so the single keydown listener never reads stale closure state
  const latestRef = useRef<{
    activeTab: Tab | null;
    handleSend: () => void;
    showSnackbar: (m: string) => void;
    settingsOpen: boolean;
    setSettingsOpen: (v: boolean) => void;
  }>({
    activeTab: null,
    handleSend: () => {},
    showSnackbar: () => {},
    settingsOpen: false,
    setSettingsOpen: () => {}
  });

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

  const selectedMethod: SelectedMethod | null = activeTab
    ? { collectionUrl: activeTab.collectionUrl, service: activeTab.service, method: activeTab.method }
    : null;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  function handleThemeChange(next: Theme) {
    setTheme(next);
    saveTheme(next);
  }

  function updateTab(id: string, patch: Partial<Tab>) {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  const activeSending = activeTab?.sending ?? false;
  useEffect(() => {
    if (!activeSending || !activeTabId) {
      if (activeTabId) setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, elapsed: 0 } : t)));
      return;
    }
    const start = Date.now();
    const id = setInterval(() => {
      setTabs((prev) =>
        prev.map((t) => (t.id === activeTabId ? { ...t, elapsed: Math.floor((Date.now() - start) / 1000) } : t))
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

  // Keep ref in sync so the keydown listener always reads current state
  latestRef.current.activeTab = activeTab;
  latestRef.current.handleSend = handleSend;
  latestRef.current.showSnackbar = showSnackbar;
  latestRef.current.settingsOpen = settingsOpen;
  latestRef.current.setSettingsOpen = setSettingsOpen;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const {
        activeTab: tab,
        handleSend: send,
        showSnackbar: snack,
        settingsOpen: isSettingsOpen,
        setSettingsOpen: openSettings
      } = latestRef.current;
      if (e.key === "," && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        openSettings(true);
        return;
      }
      if (e.key === "Escape") {
        if (isSettingsOpen) {
          openSettings(false);
          return;
        }
        if (tab?.sending) {
          window.grpcui.cancelRequest(tab.id);
          return;
        }
        return;
      }
      if (!(e.key === "Enter" && e.metaKey)) return;
      if (!tab) {
        snack("Select a method before sending");
      } else if (tab.sending) {
        snack("A request is already in flight");
      } else {
        send();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      streamTimestamps: [],
      responseError: null,
      sending: false,
      elapsed: 0,
      status: "idle"
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
    const isStreaming = activeTab.method.serverStreaming;
    updateTab(tabId, { sending: true, response: null, streamTimestamps: [], responseError: null, status: "sending" });

    let unsubscribe: (() => void) | null = null;
    if (isStreaming) {
      unsubscribe = window.grpcui.onStreamData(({ requestId, data }) => {
        if (requestId !== tabId) return;
        const ts = Date.now();
        setTabs((prev) =>
          prev.map((t) => {
            if (t.id !== tabId) return t;
            const existing = Array.isArray(t.response) ? (t.response as unknown[]) : [];
            return { ...t, response: [...existing, data], streamTimestamps: [...t.streamTimestamps, ts] };
          })
        );
      });
    }

    try {
      const res = await window.grpcui.sendRequest(
        {
          url: activeTab.collectionUrl,
          serviceName: activeTab.service.name,
          methodName: activeTab.method.name,
          requestType: activeTab.method.requestType,
          responseType: activeTab.method.responseType,
          requestJson: activeTab.requestBody,
          fileDescriptors: col.fileDescriptors,
          metadata: activeTab.metadata,
          serverStreaming: isStreaming
        },
        tabId
      );
      // For streaming, res is the complete array — use it as the source of truth.
      // For unary, res is the single response object.
      updateTab(tabId, { response: res, status: "success" });
    } catch (err: unknown) {
      const msg = (err as Error).message ?? "Request failed";
      updateTab(tabId, {
        responseError: msg.includes("Cancelled") ? "Request cancelled." : msg,
        status: "error"
      });
    } finally {
      unsubscribe?.();
      updateTab(tabId, { sending: false });
    }
  }

  const monacoTheme = theme === "light" ? "vs" : "vs-dark";

  return (
    <div className="app">
      <Sidebar
        collections={collections}
        onCollectionsChange={handleCollectionsChange}
        selectedMethod={selectedMethod}
        onSelectMethod={handleSelectMethod}
        tabStatuses={new Map(tabs.map((t) => [`${t.collectionUrl}|${t.service.name}|${t.method.name}`, t.status]))}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <div className="app-main">
        <TabBar tabs={tabs} activeTabId={activeTabId} onSelect={setActiveTabId} onClose={handleCloseTab} />
        <div className="app-top-row">
          <AddressBar
            url={activeTab?.collectionUrl ?? ""}
            canSend={!!activeTab && !activeTab.sending}
            sending={activeTab?.sending ?? false}
            elapsed={activeTab?.elapsed ?? 0}
            onSend={handleSend}
            onCancel={() => activeTab && window.grpcui.cancelRequest(activeTab.id)}
          />
        </div>
        <div className="app-panels">
          {activeTab ? (
            <>
              <div className="app-left-panel">
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
                      <span className="editor-tab-badge">{activeTab.metadata.filter((r) => r.key.trim()).length}</span>
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
                    monacoTheme={monacoTheme}
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
                streamTimestamps={activeTab.streamTimestamps}
                error={activeTab.responseError}
                loading={activeTab.sending}
                monacoTheme={monacoTheme}
              />
            </>
          ) : (
            <div className="app-placeholder">Select a method from the sidebar to get started</div>
          )}
        </div>
      </div>
      <Snackbar message={snackbar.message} visible={snackbar.visible} />
      {settingsOpen && (
        <Settings theme={theme} onThemeChange={handleThemeChange} onClose={() => setSettingsOpen(false)} />
      )}
    </div>
  );
}
