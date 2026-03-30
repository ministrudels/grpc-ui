import React from "react";
import "./styles.css";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Left half of the main panels area. Provides a free-form textarea for
 * editing the JSON request payload. Pre-populated with a skeleton derived
 * from the selected method's input message definition when a method is chosen.
 */
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
