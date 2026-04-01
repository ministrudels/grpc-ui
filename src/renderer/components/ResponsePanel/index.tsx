import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";
import "./styles.css";

interface Props {
  response: unknown;
  error: string | null;
  loading: boolean;
}

export default function ResponsePanel({ response, error, loading }: Props) {
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
          <CodeMirror
            value={JSON.stringify(response, null, 2)}
            extensions={[json()]}
            theme={oneDark}
            readOnly
            basicSetup={{ lineNumbers: false, foldGutter: false }}
            style={{ fontSize: 13, height: "100%" }}
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
