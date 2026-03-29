import React, { useState } from "react";
import AddCollectionDialog from "./AddCollectionDialog";

const containerStyle: React.CSSProperties = {
  width: 240,
  flexShrink: 0,
  borderRight: "1px solid #313244",
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  color: "#6c7086",
  fontSize: 13,
};

const buttonStyle: React.CSSProperties = {
  background: "#313244",
  border: "none",
  borderRadius: 4,
  color: "#cdd6f4",
  fontSize: 13,
  padding: "6px 10px",
  cursor: "pointer",
  textAlign: "left",
  width: "100%",
};

export default function Sidebar() {
  const [dialogOpen, setDialogOpen] = useState(false);

  function handleConfirm(url: string) {
    window.grpcui.connectServer(url).then((result) => {
      console.log("Connected:", result);
    });
  }

  return (
    <div style={containerStyle}>
      <button style={buttonStyle} onClick={() => setDialogOpen(true)}>
        + Add Collection
      </button>
      <span>Collections will appear here</span>
      {dialogOpen && (
        <AddCollectionDialog
          onClose={() => setDialogOpen(false)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}
