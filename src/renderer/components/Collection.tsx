import React, { useState } from "react";
import Service from "./Service";
import type { GrpcMessage, GrpcService } from "../global";
import type { SelectedMethod } from "../App";
import type { OnSelectMethod } from "./Sidebar";

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  cursor: "pointer",
  userSelect: "none",
  paddingBottom: 4,
};

const nameStyle: React.CSSProperties = {
  color: "#e2e2e2",
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
  color: "#686868",
  fontSize: 9,
  flexShrink: 0,
  transform: open ? "rotate(90deg)" : "rotate(0deg)",
  transition: "transform 0.15s ease",
});

const resyncButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#686868",
  cursor: "pointer",
  fontSize: 11,
  padding: "0 2px",
  flexShrink: 0,
  lineHeight: 1,
};

interface CollectionData {
  url: string;
  name: string;
  services: GrpcService[];
  messages: GrpcMessage[];
}

interface Props {
  collection: CollectionData;
  selectedMethod: SelectedMethod | null;
  onSelectMethod: OnSelectMethod;
  onResync: (url: string) => void;
}

export default function Collection({ collection, selectedMethod, onSelectMethod, onResync }: Props) {
  const [open, setOpen] = useState(true);
  const [syncing, setSyncing] = useState(false);

  function handleResync(e: React.MouseEvent) {
    e.stopPropagation();
    setSyncing(true);
    onResync(collection.url);
    // Spinner clears when parent re-renders with fresh data (Sidebar controls the state)
    // Use a short delay to give visual feedback even on fast connections
    setTimeout(() => setSyncing(false), 600);
  }

  return (
    <div>
      <div style={headerStyle} title={collection.url} onClick={() => setOpen((o) => !o)}>
        <span style={chevronStyle(open)}>▶</span>
        <span style={nameStyle}>{collection.name}</span>
        <button
          style={{
            ...resyncButtonStyle,
            animation: syncing ? "spin 0.7s linear infinite" : "none",
          }}
          title={`Resync ${collection.url}`}
          onClick={handleResync}
        >
          ↻
        </button>
      </div>

      {open && collection.services.map((svc) => (
        <Service
          key={svc.name}
          service={svc}
          collectionUrl={collection.url}
          messages={collection.messages}
          selectedMethod={selectedMethod}
          onSelectMethod={onSelectMethod}
        />
      ))}
    </div>
  );
}
