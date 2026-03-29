import React from "react";

const style: React.CSSProperties = {
  width: 240,
  flexShrink: 0,
  borderRight: "1px solid #313244",
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  color: "#6c7086",
  fontSize: 13,
};

export default function Sidebar() {
  return (
    <div style={style}>
      <span>Sidebar — navigate between requests / collections</span>
    </div>
  );
}
