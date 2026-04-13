import { useEffect, useRef, useState } from "react";
import Sidebar from "./components/Sidebar";
import TabBar from "./components/TabBar";
import AddressBar from "./components/AddressBar";
import RequestBody from "./components/RequestBody";
import MetadataEditor, { type MetadataRow } from "./components/MetadataEditor";
import ResponsePanel from "./components/ResponsePanel";
import Snackbar from "./components/Snackbar";
import UpdateBanner from "./components/UpdateBanner";
import Settings from "./components/Settings";
import type { GrpcMethod, GrpcService, NamedCollection } from "./global";
import { skeletonFromMessage } from "./proto";
import type { OnSelectMethod } from "./components/Sidebar";
import { useGrpcRequest } from "./hooks/useGrpcRequest";
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
  responseErrorTs: number | null;
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
  const [updateReady, setUpdateReady] = useState(false);
  // Always holds the latest values so the single keydown listener never reads stale closure state
  const latestRef = useRef<{
    activeTab: Tab | null;
    tabs: Tab[];
    activeTabId: string | null;
    setActiveTabId: (id: string | null) => void;
    closeTab: (id: string) => void;
    send: () => void;
    cancel: () => void;
    isPending: boolean;
    showSnackbar: (m: string) => void;
    settingsOpen: boolean;
    setSettingsOpen: (v: boolean) => void;
  }>({
    activeTab: null,
    tabs: [],
    activeTabId: null,
    setActiveTabId: () => {},
    closeTab: () => {},
    send: () => {},
    cancel: () => {},
    isPending: false,
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

  useEffect(() => {
    return window.grpcui.onOpenSettings(() => setSettingsOpen(true));
  }, []);

  useEffect(() => {
    return window.grpcui.onUpdateReady(() => setUpdateReady(true));
  }, []);

  function handleThemeChange(next: Theme) {
    setTheme(next);
    saveTheme(next);
  }

  function updateTab(id: string, patch: Partial<Tab>) {
    setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  const { isPending, send, cancel, elapsed } = useGrpcRequest(activeTab, collections, updateTab, setTabs);

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
  latestRef.current.tabs = tabs;
  latestRef.current.activeTabId = activeTabId;
  latestRef.current.setActiveTabId = setActiveTabId;
  latestRef.current.closeTab = handleCloseTab;
  latestRef.current.send = send;
  latestRef.current.cancel = cancel;
  latestRef.current.isPending = isPending;
  latestRef.current.showSnackbar = showSnackbar;
  latestRef.current.settingsOpen = settingsOpen;
  latestRef.current.setSettingsOpen = setSettingsOpen;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const {
        activeTab: tab,
        tabs: allTabs,
        activeTabId: currentTabId,
        setActiveTabId: selectTab,
        closeTab,
        send: doSend,
        cancel: doCancel,
        isPending: pending,
        showSnackbar: snack,
        settingsOpen: isSettingsOpen,
        setSettingsOpen: openSettings
      } = latestRef.current;

      const cmd = e.metaKey || e.ctrlKey;

      if (e.key === "," && cmd) {
        e.preventDefault();
        openSettings(true);
        return;
      }

      if (e.key === "Escape") {
        if (isSettingsOpen) { openSettings(false); return; }
        if (pending) { doCancel(); return; }
        return;
      }

      // Close current tab
      if (e.key === "w" && cmd) {
        e.preventDefault();
        if (currentTabId) closeTab(currentTabId);
        return;
      }

      // Navigate to previous / next tab (Ctrl+Tab / Ctrl+Shift+Tab)
      if (e.ctrlKey && e.key === "Tab") {
        e.preventDefault();
        if (allTabs.length < 2) return;
        const idx = allTabs.findIndex((t) => t.id === currentTabId);
        const next = e.shiftKey ? allTabs[idx - 1] ?? allTabs[allTabs.length - 1]
                                : allTabs[idx + 1] ?? allTabs[0];
        selectTab(next.id);
        return;
      }

      // Jump to tab by number (Cmd+1 … Cmd+9)
      if (cmd && e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        const target = allTabs[parseInt(e.key, 10) - 1];
        if (target) selectTab(target.id);
        return;
      }

      if (!(e.key === "Enter" && cmd)) return;
      if (!tab) {
        snack("Select a method before sending");
      } else if (pending) {
        snack("A request is already in flight");
      } else {
        doSend();
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
      responseErrorTs: null,
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

  const monacoTheme = theme === "light" ? "vs" : "vs-dark";

  return (
    <div className="app-root">
      {updateReady && <UpdateBanner onInstall={window.grpcui.installUpdate} />}
      <div className="app">
      <Sidebar
        collections={collections}
        onCollectionsChange={handleCollectionsChange}
        selectedMethod={selectedMethod}
        onSelectMethod={handleSelectMethod}
        tabStatuses={new Map(tabs.map((t) => [`${t.collectionUrl}|${t.service.name}|${t.method.name}`, t.status]))}
      />
      <div className="app-main">
        <TabBar tabs={tabs} activeTabId={activeTabId} onSelect={setActiveTabId} onClose={handleCloseTab} />
        <div className="app-top-row">
          <AddressBar
            url={activeTab?.collectionUrl ?? ""}
            canSend={!!activeTab && !isPending}
            sending={isPending}
            elapsed={elapsed}
            onUrlChange={(url) => activeTab && updateTab(activeTab.id, { collectionUrl: url })}
            onSend={send}
            onCancel={cancel}
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
                    onSend={send}
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
                errorTs={activeTab.responseErrorTs}
                loading={isPending}
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
    </div>
  );
}
