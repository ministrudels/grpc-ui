import React, { useState } from "react";
import Method from "./Method";
import type { GrpcService } from "../global";
import type { SelectedMethod } from "../App";

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  cursor: "pointer",
  userSelect: "none",
  padding: "2px 0 2px 8px",
};

const nameStyle: React.CSSProperties = {
  color: "#89b4fa",
  fontSize: 12,
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

interface Props {
  service: GrpcService;
  collectionUrl: string;
  selectedMethod: SelectedMethod | null;
  onSelectMethod: (selected: SelectedMethod) => void;
}

export default function Service({ service, collectionUrl, selectedMethod, onSelectMethod }: Props) {
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
            selectedMethod?.serviceName === service.name &&
            selectedMethod?.methodName === method.name
          }
          onClick={() =>
            onSelectMethod({
              collectionUrl,
              serviceName: service.name,
              methodName: method.name,
            })
          }
        />
      ))}
    </div>
  );
}
