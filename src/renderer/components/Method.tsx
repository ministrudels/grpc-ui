import React, { useState } from "react";
import type { GrpcMethod } from "../global";

const baseStyle: React.CSSProperties = {
  color: "#f0f0f0",
  fontSize: 12,
  padding: "2px 4px 2px 20px",
  borderRadius: 3,
  cursor: "pointer",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const hoverStyle: React.CSSProperties = { ...baseStyle, background: "#242424" };
const activeStyle: React.CSSProperties = { ...baseStyle, background: "#2d2d2d", color: "#e2e2e2" };

interface Props {
  method: GrpcMethod;
  active: boolean;
  onClick: () => void;
}

export default function Method({ method, active, onClick }: Props) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={active ? activeStyle : hovered ? hoverStyle : baseStyle}
      title={method.name}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {method.name}
    </div>
  );
}
