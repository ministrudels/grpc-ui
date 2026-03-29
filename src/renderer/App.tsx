import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import AddressBar from "./components/AddressBar";
import RequestBody from "./components/RequestBody";
import ResponsePanel from "./components/ResponsePanel";

export type SelectedMethod = {
  collectionUrl: string;
  serviceName: string;
  methodName: string;
};

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
  placeholder: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#45475a",
    fontSize: 14,
  },
};

export default function App() {
  const [selectedMethod, setSelectedMethod] = useState<SelectedMethod | null>(null);

  return (
    <div style={styles.app}>
      <Sidebar
        selectedMethod={selectedMethod}
        onSelectMethod={setSelectedMethod}
      />
      <div style={styles.main}>
        <div style={styles.topRow}>
          <AddressBar />
        </div>
        <div style={styles.panels}>
          {selectedMethod ? (
            <>
              <RequestBody />
              <ResponsePanel />
            </>
          ) : (
            <div style={styles.placeholder}>
              Select a method from the sidebar to get started
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
