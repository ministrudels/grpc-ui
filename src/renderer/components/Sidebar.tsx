import React, { useState } from "react";
import AddCollectionDialog from "./AddCollectionDialog";
import type { Collection } from "../global";
import type { SelectedMethod } from "../App";

type NamedCollection = Collection & { name: string };

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

const containerStyle: React.CSSProperties = {
  width: 240,
  flexShrink: 0,
  borderRight: "1px solid #313244",
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  color: "#6c7086",
  fontSize: 13,
  overflowY: "auto",
};

const addButtonStyle: React.CSSProperties = {
  background: "#313244",
  border: "none",
  borderRadius: 4,
  color: "#cdd6f4",
  fontSize: 13,
  padding: "6px 10px",
  cursor: "pointer",
  textAlign: "left",
  width: "100%",
  flexShrink: 0,
};

const collectionHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  cursor: "pointer",
  userSelect: "none",
  paddingBottom: 4,
};

const collectionNameStyle: React.CSSProperties = {
  color: "#cdd6f4",
  fontWeight: 600,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  flex: 1,
};

const chevronStyle = (open: boolean): React.CSSProperties => ({
  color: "#6c7086",
  fontSize: 9,
  flexShrink: 0,
  transform: open ? "rotate(90deg)" : "rotate(0deg)",
  transition: "transform 0.15s ease",
});

const serviceHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  cursor: "pointer",
  userSelect: "none",
  padding: "2px 0 2px 8px",
};

const serviceNameStyle: React.CSSProperties = {
  color: "#89b4fa",
  fontSize: 12,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  flex: 1,
};

const methodStyle: React.CSSProperties = {
  color: "#a6e3a1",
  fontSize: 12,
  padding: "2px 4px 2px 20px",
  borderRadius: 3,
  cursor: "pointer",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const methodHoverStyle: React.CSSProperties = {
  ...methodStyle,
  background: "#25253a",
};

const methodActiveStyle: React.CSSProperties = {
  ...methodStyle,
  background: "#313244",
  color: "#cdd6f4",
};

interface Props {
  selectedMethod: SelectedMethod | null;
  onSelectMethod: (selected: SelectedMethod) => void;
}

export default function Sidebar({ selectedMethod, onSelectMethod }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [collections, setCollections] = useState<NamedCollection[]>(loadCollections);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Collapsed state: Set of collapsed keys. Collections keyed by url, services by "url::svcName".
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [hoveredMethod, setHoveredMethod] = useState<string | null>(null);

  function toggleCollapsed(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleConfirm(name: string, url: string) {
    setLoading(true);
    setError(null);
    window.grpcui
      .connectServer(url)
      .then((collection) => {
        const next = [...collections, { ...collection, name }];
        saveCollections(next);
        setCollections(next);
      })
      .catch((err: Error) => setError(err.message ?? "Failed to connect"))
      .finally(() => setLoading(false));
  }

  return (
    <div style={containerStyle}>
      <button
        style={addButtonStyle}
        onClick={() => setDialogOpen(true)}
        disabled={loading}
      >
        {loading ? (
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                border: "2px solid #6c7086",
                borderTopColor: "#cdd6f4",
                display: "inline-block",
                animation: "spin 0.7s linear infinite",
              }}
            />
            Connecting…
          </span>
        ) : (
          "+ Add Collection"
        )}
      </button>

      {error && (
        <span style={{ color: "#f38ba8", fontSize: 12 }}>{error}</span>
      )}

      {collections.length === 0 && !loading && (
        <span>Collections will appear here</span>
      )}

      {collections.map((col) => {
        const colOpen = !collapsed.has(col.url);
        return (
          <div key={col.url}>
            <div
              style={collectionHeaderStyle}
              title={col.url}
              onClick={() => toggleCollapsed(col.url)}
            >
              <span style={chevronStyle(colOpen)}>▶</span>
              <span style={collectionNameStyle}>{col.name}</span>
            </div>

            {colOpen && col.services.map((svc) => {
              const svcKey = `${col.url}::${svc.name}`;
              const svcOpen = !collapsed.has(svcKey);
              return (
                <div key={svc.name}>
                  <div
                    style={serviceHeaderStyle}
                    title={svc.name}
                    onClick={() => toggleCollapsed(svcKey)}
                  >
                    <span style={chevronStyle(svcOpen)}>▶</span>
                    <span style={serviceNameStyle}>{svc.name.split(".").pop()}</span>
                  </div>

                  {svcOpen && svc.methods.map((method) => {
                    const methodKey = `${col.url}::${svc.name}::${method.name}`;
                    const isActive =
                      selectedMethod?.collectionUrl === col.url &&
                      selectedMethod?.serviceName === svc.name &&
                      selectedMethod?.methodName === method.name;
                    const isHovered = hoveredMethod === methodKey;
                    return (
                      <div
                        key={method.name}
                        style={
                          isActive
                            ? methodActiveStyle
                            : isHovered
                            ? methodHoverStyle
                            : methodStyle
                        }
                        title={method.name}
                        onClick={() =>
                          onSelectMethod({
                            collectionUrl: col.url,
                            serviceName: svc.name,
                            methodName: method.name,
                          })
                        }
                        onMouseEnter={() => setHoveredMethod(methodKey)}
                        onMouseLeave={() => setHoveredMethod(null)}
                      >
                        {method.name}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}

      {dialogOpen && (
        <AddCollectionDialog
          onClose={() => setDialogOpen(false)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}
