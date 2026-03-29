import React, { useState } from "react";
import Method from "./Method";
import type { GrpcMessage, GrpcService } from "../global";
import type { SelectedMethod } from "../App";
import type { OnSelectMethod } from "./Sidebar";

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  cursor: "pointer",
  userSelect: "none",
  padding: "2px 0 2px 8px",
};

const nameStyle: React.CSSProperties = {
  color: "#aaaaaa",
  fontSize: 12,
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

interface Props {
  service: GrpcService;
  collectionUrl: string;
  messages: GrpcMessage[];
  selectedMethod: SelectedMethod | null;
  onSelectMethod: OnSelectMethod;
}

export default function Service({ service, collectionUrl, messages, selectedMethod, onSelectMethod }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <div style={headerStyle} title={service.name} onClick={() => setOpen((o) => !o)}>
        <span style={chevronStyle(open)}>▶</span>
        <span style={nameStyle}>{service.name.split(".").pop()}</span>
      </div>

      {open && service.methods.map((method) => (
        <Method
          key={method.name}
          method={method}
          active={
            selectedMethod?.collectionUrl === collectionUrl &&
            selectedMethod?.service.name === service.name &&
            selectedMethod?.method.name === method.name
          }
          onClick={() => onSelectMethod(collectionUrl, service, method, messages)}
        />
      ))}
    </div>
  );
}
