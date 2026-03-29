import React, { useState } from "react";
import AddCollectionDialog from "./AddCollectionDialog";
import type { Collection } from "../global";

type NamedCollection = Collection & { name: string };

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

const collectionUrlStyle: React.CSSProperties = {
  color: "#cdd6f4",
  fontWeight: 600,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  paddingBottom: 4,
};

const serviceNameStyle: React.CSSProperties = {
  color: "#89b4fa",
  fontSize: 12,
  padding: "2px 0 2px 8px",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
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

export default function Sidebar() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [collections, setCollections] = useState<NamedCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleConfirm(name: string, url: string) {
    setLoading(true);
    setError(null);
    window.grpcui
      .connectServer(url)
      .then((collection) => setCollections((prev) => [...prev, { ...collection, name }]))
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

      {collections.map((col) => (
        <div key={col.url}>
          <div style={collectionUrlStyle} title={col.url}>
            {col.name}
          </div>
          {col.services.map((svc) => (
            <div key={svc.name}>
              <div style={serviceNameStyle} title={svc.name}>
                {svc.name.split(".").pop()}
              </div>
              {svc.methods.map((method) => (
                <div key={method.name} style={methodStyle} title={method.name}>
                  {method.name}
                </div>
              ))}
            </div>
          ))}
        </div>
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
