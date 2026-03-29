import React from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

const containerStyle: React.CSSProperties = {
  flex: 1,
  borderRight: "1px solid #2d2d2d",
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  minHeight: 0,
};

const labelStyle: React.CSSProperties = {
  color: "#686868",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  padding: "6px 12px 4px",
  borderBottom: "1px solid #2d2d2d",
  flexShrink: 0,
};

const textareaStyle: React.CSSProperties = {
  flex: 1,
  background: "transparent",
  border: "none",
  outline: "none",
  color: "#e2e2e2",
  fontSize: 13,
  fontFamily: "monospace",
  padding: 12,
  resize: "none",
  lineHeight: 1.5,
};

export default function RequestBody({ value, onChange }: Props) {
  return (
    <div style={containerStyle}>
      <div style={labelStyle}>Request</div>
      <textarea
        style={textareaStyle}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
    </div>
  );
}
