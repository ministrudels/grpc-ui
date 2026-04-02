import Editor, { type OnMount } from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";
import type * as monaco from "monaco-editor";
import "./styles.css";

interface Props {
  response: unknown;
  streamTimestamps: number[];
  error: string | null;
  loading: boolean;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className={`copy-btn${copied ? " copied" : ""}`}
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function ResponseHeader({ copyText, streaming }: { copyText?: string; streaming?: boolean }) {
  return (
    <div className="response-label">
      <span>{streaming ? "Streaming…" : "Response"}</span>
      {copyText && <CopyButton text={copyText} />}
    </div>
  );
}

function formatTs(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  const ms = String(d.getMilliseconds()).padStart(3, "0");
  return `${hh}:${mm}:${ss}.${ms}`;
}

function ResponseEditor({
  text,
  streaming,
  messages,
  timestamps,
}: {
  text: string;
  streaming: boolean;
  messages: unknown[];
  timestamps: number[];
}) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const streamRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll Monaco when not streaming (content just loaded)
  useEffect(() => {
    if (streaming || !editorRef.current) return;
    const model = editorRef.current.getModel();
    if (model) editorRef.current.revealLine(1);
  }, [streaming]);

  // Auto-scroll stream list as new messages arrive
  useEffect(() => {
    if (!streaming || !streamRef.current) return;
    streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [messages.length, streaming]);

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  return (
    <div className="response-panel">
      <ResponseHeader copyText={streaming ? undefined : text} streaming={streaming} />
      {streaming ? (
        <div className="response-stream" ref={streamRef}>
          {messages.map((msg, i) => (
            <div key={i} className="stream-message">
              <span className="stream-ts">{timestamps[i] !== undefined ? formatTs(timestamps[i]) : ""}</span>
              <pre className="stream-json">{JSON.stringify(msg, null, 2)}</pre>
            </div>
          ))}
        </div>
      ) : (
        <div className="response-editor">
          <Editor
            language="json"
            theme="vs-dark"
            value={text}
            onMount={handleMount}
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
      )}
    </div>
  );
}

export default function ResponsePanel({ response, streamTimestamps, error, loading }: Props) {
  if (loading && (response === null || response === undefined)) {
    return (
      <div className="response-panel">
        <ResponseHeader />
        <div className="response-body">
          <span className="response-loading">Sending…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="response-panel">
        <ResponseHeader copyText={error} />
        <div className="response-body">
          <span className="response-error">{error}</span>
        </div>
      </div>
    );
  }

  if (response !== null && response !== undefined) {
    const messages = Array.isArray(response) ? response : [response];
    const text = JSON.stringify(response, null, 2);
    return <ResponseEditor text={text} streaming={loading} messages={messages} timestamps={streamTimestamps} />;
  }

  return (
    <div className="response-panel">
      <ResponseHeader />
    </div>
  );
}
