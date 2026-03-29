import React from "react";

const style: React.CSSProperties = {
  flex: 1,
  borderRight: "1px solid #313244",
  padding: 12,
  color: "#6c7086",
  fontSize: 13,
};

export default function RequestBody() {
  return (
    <div style={style}>
      <span>Request body — JSON / metadata for the gRPC call</span>
    </div>
  );
}
