import Editor from "@monaco-editor/react";
import { useState } from "react";
import "./styles.css";

interface Props {
  response: unknown;
  error: string | null;
  loading: boolean;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <button className={`copy-btn${copied ? " copied" : ""}`} onClick={handleCopy}>
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function ResponsePanel({ response, error, loading }: Props) {
  if (loading) {
    return (
      <div className="response-panel">
        <div className="response-label">Response</div>
        <div className="response-body">
          <span className="response-loading">Sending…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="response-panel">
        <div className="response-label">
          Response <CopyButton text={error} />
        </div>
        <div className="response-body">
          <span className="response-error">{error}</span>
        </div>
      </div>
    );
  }

  if (response !== null && response !== undefined) {
    const text = JSON.stringify(response, null, 2);
    return (
      <div className="response-panel">
        <div className="response-label">
          Response <CopyButton text={text} />
        </div>
        <div className="response-editor">
          <Editor
            language="json"
            theme="vs-dark"
            value={text}
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
              domReadOnly: true
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="response-panel">
      <div className="response-label">Response</div>
    </div>
  );
}
