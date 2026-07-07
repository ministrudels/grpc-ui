import { formatShortcut, shortcutById } from "../../../shortcuts";
import "./styles.css";

interface Props {
  url: string;
  canSend: boolean;
  sending: boolean;
  elapsed: number;
  isMac: boolean;
  onUrlChange: (url: string) => void;
  onSend: () => void;
  onCancel: () => void;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return ` ${m}:${String(s).padStart(2, "0")}`;
}

export default function AddressBar({ url, canSend, sending, elapsed, isMac, onUrlChange, onSend, onCancel }: Props) {
  const sendShortcut = formatShortcut(shortcutById("sendRequest"), isMac);
  const cancelShortcut = formatShortcut(shortcutById("cancelRequest"), isMac);

  return (
    <div className="address-bar">
      <div className="address-row">
        <input
          className="address-input"
          value={url}
          placeholder="Select a method from the sidebar"
          onChange={(e) => onUrlChange(e.target.value)}
        />
        {sending ? (
          <button className="cancel-btn" onClick={onCancel} title={`Cancel request (${cancelShortcut})`}>
            Cancel
            <span className="button-shortcut">{cancelShortcut}</span>
          </button>
        ) : (
          <button className="send-btn" disabled={!canSend} onClick={onSend} title={`Send request (${sendShortcut})`}>
            Send
            <span className="button-shortcut">{sendShortcut}</span>
          </button>
        )}
      </div>
      <span className="address-timer">{sending ? formatElapsed(elapsed) : "\u00a0"}</span>
    </div>
  );
}
