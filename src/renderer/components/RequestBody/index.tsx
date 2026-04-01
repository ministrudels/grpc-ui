import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { oneDark } from "@codemirror/theme-one-dark";
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
        <CodeMirror
          value={value}
          onChange={onChange}
          extensions={[json()]}
          theme={oneDark}
          basicSetup={{ lineNumbers: false, foldGutter: false }}
          style={{ fontSize: 13, height: "100%" }}
        />
      </div>
    </div>
  );
}
