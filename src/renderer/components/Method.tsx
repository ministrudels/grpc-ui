import React, { useState } from "react";
import type { GrpcMethod } from "../global";

const baseStyle: React.CSSProperties = {
  color: "#a6e3a1",
  fontSize: 12,
  padding: "2px 4px 2px 20px",
  borderRadius: 3,
  cursor: "pointer",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const hoverStyle: React.CSSProperties = { ...baseStyle, background: "#25253a" };
const activeStyle: React.CSSProperties = { ...baseStyle, background: "#313244", color: "#cdd6f4" };

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
