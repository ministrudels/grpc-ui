import React, { useState } from "react";
import AddCollectionDialog from "./AddCollectionDialog";
import Collection from "./Collection";
import type { Collection as CollectionType, GrpcMessage, GrpcMethod, GrpcService } from "../global";

type NamedCollection = CollectionType & { name: string };

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
  borderRight: "1px solid #2d2d2d",
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  color: "#686868",
  fontSize: 13,
  overflowY: "auto",
};

const addButtonStyle: React.CSSProperties = {
  background: "#2d2d2d",
  border: "none",
  borderRadius: 4,
  color: "#e2e2e2",
  fontSize: 13,
  padding: "6px 10px",
  cursor: "pointer",
  textAlign: "left",
  width: "100%",
  flexShrink: 0,
};

export type OnSelectMethod = (
  collectionUrl: string,
  service: GrpcService,
  method: GrpcMethod,
  messages: GrpcMessage[]
) => void;

interface Props {
  selectedMethod: { collectionUrl: string; service: GrpcService; method: GrpcMethod } | null;
  onSelectMethod: OnSelectMethod;
}

export default function Sidebar({ selectedMethod, onSelectMethod }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [collections, setCollections] = useState<NamedCollection[]>(loadCollections);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleResync(url: string) {
    const existing = collections.find((c) => c.url === url);
    if (!existing) return;
    window.grpcui
      .connectServer(url)
      .then((fresh) => {
        const next = collections.map((c) =>
          c.url === url ? { ...fresh, name: existing.name } : c
        );
        saveCollections(next);
        setCollections(next);
      })
      .catch((err: Error) => setError(err.message ?? "Failed to resync"));
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
                border: "2px solid #686868",
                borderTopColor: "#e2e2e2",
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

      {collections.map((col) => (
        <Collection
          key={col.url}
          collection={col}
          selectedMethod={selectedMethod}
          onSelectMethod={onSelectMethod}
          onResync={handleResync}
        />
      ))}

      {dialogOpen && (
        <AddCollectionDialog
          onClose={() => setDialogOpen(false)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}
