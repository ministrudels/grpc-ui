import Editor, { type OnMount } from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";
import type * as monaco from "monaco-editor";
import "./styles.css";

const LINE_HEIGHT = 19; // px at fontSize 13
const EDITOR_PADDING = 8; // top+bottom padding Monaco adds

function editorOptions(): React.ComponentProps<typeof Editor>["options"] {
  return {
    readOnly: true,
    minimap: { enabled: false },
    lineNumbers: "on",
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
  };
}

interface Props {
  response: unknown;
  streamTimestamps: number[];
  error: string | null;
  errorTs: number | null;
  loading: boolean;
  monacoTheme: string;
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

function StreamMessage({ msg, ts, monacoTheme }: { msg: unknown; ts?: number; monacoTheme: string }) {
  const json = JSON.stringify(msg, null, 2);
  const lineCount = json.split("\n").length;
  const height = lineCount * LINE_HEIGHT + EDITOR_PADDING;

  return (
    <div className="stream-message">
      {ts !== undefined && <span className="stream-ts">{formatTs(ts)}</span>}
      <div style={{ height }}>
        <Editor
          language="json"
          theme={monacoTheme}
          value={json}
          options={{ ...editorOptions(), scrollbar: { vertical: "hidden", horizontal: "hidden" } }}
        />
      </div>
    </div>
  );
}

export default function ResponsePanel({ response, streamTimestamps, error, errorTs, loading, monacoTheme }: Props) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const streamRef = useRef<HTMLDivElement | null>(null);

  const isStream = Array.isArray(response);
  const messages = isStream ? (response as unknown[]) : response !== null && response !== undefined ? [response] : [];
  const text = response !== null && response !== undefined ? JSON.stringify(response, null, 2) : "";

  useEffect(() => {
    if (!loading || !streamRef.current) return;
    streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [messages.length, loading]);

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const copyText = loading ? undefined : (error ?? (text || undefined));
  const streaming = loading && isStream;

  function renderContent() {
    // Sending with no data yet
    if (loading && response === null) {
      return <span className="response-loading">Sending…</span>;
    }

    // Streaming or stream with terminal error
    if (isStream || (streaming && error)) {
      return (
        <div className="response-stream" ref={streamRef}>
          {messages.map((msg, i) => (
            <StreamMessage key={i} msg={msg} ts={streamTimestamps[i]} monacoTheme={monacoTheme} />
          ))}
          {!loading && error && (
            <div className="stream-message stream-message-error">
              {errorTs && <span className="stream-ts">{formatTs(errorTs)}</span>}
              <span className="response-error">{error}</span>
            </div>
          )}
        </div>
      );
    }

    // Unary error
    if (error) {
      return <span className="response-error">{error}</span>;
    }

    // Unary response in Monaco
    if (response !== null && response !== undefined) {
      return (
        <Editor
          language="json"
          theme={monacoTheme}
          value={text}
          onMount={handleMount}
          options={editorOptions()}
        />
      );
    }

    return null;
  }

  const content = renderContent();
  // .response-editor: flush, no padding — used for Monaco and stream panels
  // .response-body: padded — used for loading, errors, and empty states
  const useFlush = isStream || (!error && !loading && response !== null && response !== undefined);

  return (
    <div className="response-panel">
      <ResponseHeader copyText={copyText} streaming={streaming} />
      <div className={useFlush ? "response-editor" : "response-body"}>
        {content}
      </div>
    </div>
  );
}
