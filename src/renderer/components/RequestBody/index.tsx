import Editor from "@monaco-editor/react";
import "./styles.css";

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function RequestBody({ value, onChange }: Props) {
  return (
    <div className="request-body">
      <div className="request-label">Request</div>
      <div className="request-editor">
        <Editor
          language="json"
          theme="vs-dark"
          value={value}
          onChange={(v) => onChange(v ?? "")}
          options={{
            minimap: { enabled: false },
            lineNumbers: "off",
            folding: false,
            scrollBeyondLastLine: false,
            wordWrap: "on",
            fontSize: 13,
            fontFamily: "monospace",
            renderLineHighlight: "none",
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
          }}
        />
      </div>
    </div>
  );
}
