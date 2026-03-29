import React from "react";

const style: React.CSSProperties = {
  flex: 1,
  padding: 12,
  color: "#686868",
  fontSize: 13,
};

export default function ResponsePanel() {
  return (
    <div style={style}>
      <span>Response — gRPC server response will appear here</span>
    </div>
  );
}
