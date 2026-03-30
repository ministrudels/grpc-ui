import React from "react";
import "./styles.css";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function RequestBody({ value, onChange }: Props) {
  return (
    <div className="request-body">
      <div className="request-label">Request</div>
      <textarea
        className="request-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
    </div>
  );
}
