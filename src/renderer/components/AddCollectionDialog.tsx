import React, { useState } from "react";

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 100,
};

const dialogStyle: React.CSSProperties = {
  background: "#141414",
  border: "1px solid #2d2d2d",
  borderRadius: 6,
  padding: 24,
  width: 400,
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const labelStyle: React.CSSProperties = {
  color: "#e2e2e2",
  fontSize: 14,
  fontWeight: 600,
};

const subTextStyle: React.CSSProperties = {
  color: "#686868",
  fontSize: 12,
  marginTop: 2,
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const fieldLabelStyle: React.CSSProperties = {
  color: "#9a9a9a",
  fontSize: 12,
};

const inputStyle: React.CSSProperties = {
  background: "#1a1a1a",
  border: "1px solid #2d2d2d",
  borderRadius: 4,
  color: "#e2e2e2",
  fontSize: 13,
  padding: "8px 10px",
  width: "100%",
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
};

const cancelButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid #2d2d2d",
  borderRadius: 4,
  color: "#686868",
  fontSize: 13,
  padding: "6px 16px",
  cursor: "pointer",
};

const confirmButtonStyle: React.CSSProperties = {
  background: "#89b4fa",
  border: "none",
  borderRadius: 4,
  color: "#1a1a1a",
  fontSize: 13,
  fontWeight: 600,
  padding: "6px 16px",
  cursor: "pointer",
};

interface Props {
  onClose: () => void;
  onConfirm: (name: string, url: string) => void;
}

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
    <div style={overlayStyle} onClick={onClose}>
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        <div>
          <div style={labelStyle}>Add Collection</div>
          <div style={subTextStyle}>
            Connect to a gRPC server with server reflection enabled
          </div>
        </div>

        <div style={fieldStyle}>
          <label style={fieldLabelStyle}>Name</label>
          <input
            style={inputStyle}
            placeholder="My Service"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div style={fieldStyle}>
          <label style={fieldLabelStyle}>Server URL</label>
          <input
            style={inputStyle}
            placeholder="localhost:50051"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        <div style={actionsStyle}>
          <button style={cancelButtonStyle} onClick={onClose}>
            Cancel
          </button>
          <button style={confirmButtonStyle} onClick={handleConfirm}>
            Connect
          </button>
        </div>
      </div>
    </div>
  );
}
