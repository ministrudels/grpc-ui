import React from "react";

const style: React.CSSProperties = {
  flex: 1,
  borderRight: "1px solid #2d2d2d",
  padding: 12,
  color: "#686868",
  fontSize: 13,
};

export default function RequestBody() {
  return (
    <div style={style}>
      <span>Request body — JSON / metadata for the gRPC call</span>
    </div>
  );
}
