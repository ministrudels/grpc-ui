import Editor from "@monaco-editor/react";
import "./styles.css";

interface Props {
  response: unknown;
  error: string | null;
  loading: boolean;
  monacoTheme: string;
}

export default function ResponsePanel({ response, error, loading, monacoTheme }: Props) {
  if (loading) {
    return (
      <div className="response-panel">
        <div className="response-label">Response</div>
        <div className="response-body"><span className="response-loading">Sending…</span></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="response-panel">
        <div className="response-label">Response</div>
        <div className="response-body"><span className="response-error">{error}</span></div>
      </div>
    );
  }

  if (response !== null && response !== undefined) {
    return (
      <div className="response-panel">
        <div className="response-label">Response</div>
        <div className="response-editor">
          <Editor
            language="json"
            theme={monacoTheme}
            value={JSON.stringify(response, null, 2)}
            options={{
              readOnly: true,
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
              domReadOnly: true,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="response-panel">
      <div className="response-label">Response</div>
      <div className="response-body"><span className="response-pending">Response will appear here</span></div>
    </div>
  );
}
