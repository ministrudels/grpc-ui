import React from "react";

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
};

const buttonStyle: React.CSSProperties = {
  background: "#313244",
  border: "none",
  borderRadius: 4,
  color: "#cdd6f4",
  fontSize: 13,
  padding: "6px 10px",
  cursor: "pointer",
  textAlign: "left",
  width: "100%",
};

export default function Sidebar() {
  return (
    <div style={containerStyle}>
      <button style={buttonStyle}>+ Add Collection</button>
      <span>Collections will appear here</span>
    </div>
  );
}
