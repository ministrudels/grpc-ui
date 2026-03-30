import React from "react";
import "./styles.css";

interface Props {
  url: string;
  canSend: boolean;
  sending: boolean;
  onSend: () => void;
}

export default function AddressBar({ url, canSend, sending, onSend }: Props) {
  return (
    <div className="address-bar">
      <input
        className="address-input"
        value={url}
        placeholder="Select a method from the sidebar"
        readOnly
      />
      <button className="send-btn" disabled={!canSend} onClick={onSend}>
        {sending ? "Sending…" : "Send"}
      </button>
    </div>
  );
}
