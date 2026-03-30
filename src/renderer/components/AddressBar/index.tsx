import React from "react";
import "./styles.css";

interface Props {
  url: string;
  canSend: boolean;
  sending: boolean;
  onSend: () => void;
}

/**
 * Top bar showing the target server URL for the selected method alongside
 * the Send button. The button is enabled only when a method is selected and
 * no request is in flight, and switches to a "Sending…" label during loading.
 */
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
