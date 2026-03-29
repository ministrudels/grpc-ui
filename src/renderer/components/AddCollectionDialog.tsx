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
  background: "#181825",
  border: "1px solid #313244",
  borderRadius: 6,
  padding: 24,
  width: 400,
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const labelStyle: React.CSSProperties = {
  color: "#cdd6f4",
  fontSize: 14,
  fontWeight: 600,
};

const subTextStyle: React.CSSProperties = {
  color: "#6c7086",
  fontSize: 12,
  marginTop: 2,
};

const inputStyle: React.CSSProperties = {
  background: "#1e1e2e",
  border: "1px solid #313244",
  borderRadius: 4,
  color: "#cdd6f4",
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
  border: "1px solid #313244",
  borderRadius: 4,
  color: "#6c7086",
  fontSize: 13,
  padding: "6px 16px",
  cursor: "pointer",
};

const confirmButtonStyle: React.CSSProperties = {
  background: "#89b4fa",
  border: "none",
  borderRadius: 4,
  color: "#1e1e2e",
  fontSize: 13,
  fontWeight: 600,
  padding: "6px 16px",
  cursor: "pointer",
};

interface Props {
  onClose: () => void;
  onConfirm: (url: string) => void;
}

export default function AddCollectionDialog({ onClose, onConfirm }: Props) {
  const [url, setUrl] = useState("");

  function handleConfirm() {
    const trimmed = url.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
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
        <input
          style={inputStyle}
          placeholder="localhost:50051"
          value={url}
          autoFocus
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
        />
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
