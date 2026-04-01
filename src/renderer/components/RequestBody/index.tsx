import Editor, { type OnMount } from "@monaco-editor/react";
import { KeyMod, KeyCode } from "monaco-editor";
import { useEffect, useRef } from "react";
import type { GrpcField, GrpcMessage } from "../../global";
import "./styles.css";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  requestType?: string;
  messages?: GrpcMessage[];
}

// ── Proto → JSON Schema ───────────────────────────────────────────────────────

function fieldSchema(field: GrpcField, messages: GrpcMessage[], visited: Set<string>): object {
  const base = typeSchema(field.type, field.typeName, messages, visited);
  return field.repeated ? { type: "array", items: base } : base;
}

function typeSchema(type: string, typeName: string, messages: GrpcMessage[], visited: Set<string>): object {
  switch (type) {
    case "TYPE_STRING":
    case "TYPE_BYTES":  return { type: "string" };
    case "TYPE_BOOL":   return { type: "boolean" };
    case "TYPE_FLOAT":
    case "TYPE_DOUBLE":
    case "TYPE_INT32":
    case "TYPE_INT64":
    case "TYPE_UINT32":
    case "TYPE_UINT64":
    case "TYPE_SINT32":
    case "TYPE_SINT64":
    case "TYPE_FIXED32":
    case "TYPE_FIXED64":
    case "TYPE_SFIXED32":
    case "TYPE_SFIXED64": return { type: "number" };
    case "TYPE_ENUM":   return { type: "number", description: `enum: ${typeName}` };
    case "TYPE_MESSAGE": return messageSchema(typeName, messages, visited);
    default: return {};
  }
}

function messageSchema(typeName: string, messages: GrpcMessage[], visited: Set<string>): object {
  if (visited.has(typeName)) return { type: "object" };
  const msg = messages.find((m) => m.name === typeName);
  if (!msg) return { type: "object" };

  const next = new Set(visited);
  next.add(typeName);

  const properties: Record<string, object> = {};
  for (const field of msg.fields) {
    properties[field.name] = fieldSchema(field, messages, next);
  }

  return { type: "object", properties };
}

// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applySchema(monaco: any, requestType: string | undefined, messages: GrpcMessage[]) {
  const schema = requestType ? messageSchema(requestType, messages, new Set()) : {};
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
