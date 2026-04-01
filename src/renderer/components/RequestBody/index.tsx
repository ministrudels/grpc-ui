import Editor, { type OnMount } from "@monaco-editor/react";
import { KeyMod, KeyCode } from "monaco-editor";
import { useEffect, useRef } from "react";
import type { GrpcMessage } from "../../global";
import { schemaFromMessage } from "../../proto";
import "./styles.css";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  requestType?: string;
  messages?: GrpcMessage[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applySchema(monaco: any, requestType: string | undefined, messages: GrpcMessage[]) {
  const schema = requestType ? schemaFromMessage(requestType, messages) : {};
  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    enableSchemaRequest: false,
    schemas: [{
      uri: "proto://request-schema.json",
      fileMatch: ["request.json"],
      schema,
    }],
  });
}

export default function RequestBody({ value, onChange, onSend, requestType, messages = [] }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const monacoRef = useRef<any>(null);

  const handleMount: OnMount = (editor, monaco) => {
    monacoRef.current = monaco;
    editor.addCommand(KeyMod.CtrlCmd | KeyCode.Enter, onSend);
    applySchema(monaco, requestType, messages);
  };

  useEffect(() => {
    if (!monacoRef.current) return;
    applySchema(monacoRef.current, requestType, messages);
  }, [requestType, messages]);

  return (
    <div className="request-body">
      <div className="request-label">Request</div>
      <div className="request-editor">
        <Editor
          path="request.json"
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
