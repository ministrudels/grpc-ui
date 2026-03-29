import React from "react";

interface Props {
  url: string;
}

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
  color: "#e2e2e2",
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

export default function AddressBar({ url }: Props) {
  return (
    <div style={containerStyle}>
      <input
        style={inputStyle}
        value={url}
        placeholder="Select a method from the sidebar"
        readOnly
      />
      <button style={buttonStyle}>Send</button>
    </div>
  );
}
