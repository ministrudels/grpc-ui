import Editor, { type OnMount } from "@monaco-editor/react";
import { KeyMod, KeyCode } from "monaco-editor";
import "./styles.css";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
}

export default function RequestBody({ value, onChange, onSend }: Props) {
  const handleMount: OnMount = (editor) => {
    editor.addCommand(KeyMod.CtrlCmd | KeyCode.Enter, onSend);
  };

  return (
    <div className="request-body">
      <div className="request-label">Request</div>
      <div className="request-editor">
        <Editor
          language="json"
          theme="vs-dark"
          value={value}
          onChange={(v) => onChange(v ?? "")}
          onMount={handleMount}
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
