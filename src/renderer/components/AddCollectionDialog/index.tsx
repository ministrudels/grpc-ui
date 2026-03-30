import React, { useState } from "react";
import "./styles.css";

interface Props {
  onClose: () => void;
  onConfirm: (name: string, url: string) => void;
}

/**
 * Modal dialog for adding a new collection. Collects a display name and
 * server URL, then calls onConfirm. Closes on Escape, backdrop click, or
 * Cancel. Submits on Enter or the Connect button.
 */
export default function AddCollectionDialog({ onClose, onConfirm }: Props) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  function handleConfirm() {
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();
    if (!trimmedName || !trimmedUrl) return;
    onConfirm(trimmedName, trimmedUrl);
    onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleConfirm();
    if (e.key === "Escape") onClose();
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div>
          <div className="dialog-title">Add Collection</div>
          <div className="dialog-subtitle">
            Connect to a gRPC server with server reflection enabled
          </div>
        </div>

        <div className="dialog-field">
          <label className="dialog-field-label">Name</label>
          <input
            className="dialog-input"
            placeholder="My Service"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="dialog-field">
          <label className="dialog-field-label">Server URL</label>
          <input
            className="dialog-input"
            placeholder="localhost:50051"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div className="dialog-actions">
          <button className="dialog-cancel" onClick={onClose}>Cancel</button>
          <button className="dialog-confirm" onClick={handleConfirm}>Connect</button>
        </div>
      </div>
    </div>
  );
}
