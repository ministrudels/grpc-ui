import React from "react";
import Sidebar from "./components/Sidebar";
import AddressBar from "./components/AddressBar";
import RequestBody from "./components/RequestBody";
import ResponsePanel from "./components/ResponsePanel";

const styles: Record<string, React.CSSProperties> = {
  app: {
    display: "flex",
    height: "100vh",
    background: "#1e1e2e",
    color: "#cdd6f4",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  topRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderBottom: "1px solid #313244",
    flexShrink: 0,
  },
  panels: {
    flex: 1,
    display: "flex",
    minHeight: 0,
  },
};

export default function App() {
  return (
    <div style={styles.app}>
      <Sidebar />
      <div style={styles.main}>
        <div style={styles.topRow}>
          <AddressBar />
        </div>
        <div style={styles.panels}>
          <RequestBody />
          <ResponsePanel />
        </div>
      </div>
    </div>
  );
}
