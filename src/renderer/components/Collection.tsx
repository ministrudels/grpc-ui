import React, { useState } from "react";
import Service from "./Service";
import type { SelectedMethod } from "../App";

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  cursor: "pointer",
  userSelect: "none",
  paddingBottom: 4,
};

const nameStyle: React.CSSProperties = {
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

interface CollectionData {
  url: string;
  name: string;
  services: import("../global").GrpcService[];
}

interface Props {
  collection: CollectionData;
  selectedMethod: SelectedMethod | null;
  onSelectMethod: (selected: SelectedMethod) => void;
}

export default function Collection({ collection, selectedMethod, onSelectMethod }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <div style={headerStyle} title={collection.url} onClick={() => setOpen((o) => !o)}>
        <span style={chevronStyle(open)}>▶</span>
        <span style={nameStyle}>{collection.name}</span>
      </div>

      {open && collection.services.map((svc) => (
        <Service
          key={svc.name}
          service={svc}
          collectionUrl={collection.url}
          selectedMethod={selectedMethod}
          onSelectMethod={onSelectMethod}
        />
      ))}
    </div>
  );
}
