import React from "react";

const containerStyle: React.CSSProperties = {
  display: "flex",
  flex: 1,
  alignItems: "center",
  gap: 8,
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: "#141414",
  border: "1px solid #2d2d2d",
  borderRadius: 4,
  color: "#686868",
  fontSize: 13,
  padding: "6px 10px",
};

const buttonStyle: React.CSSProperties = {
  background: "#2d2d2d",
  border: "none",
  borderRadius: 4,
  color: "#686868",
  fontSize: 13,
  padding: "6px 16px",
  cursor: "pointer",
  flexShrink: 0,
};

export default function AddressBar() {
  return (
    <div style={containerStyle}>
      <input style={inputStyle} placeholder="Address bar — gRPC server URL" readOnly />
      <button style={buttonStyle}>Send</button>
    </div>
  );
}
