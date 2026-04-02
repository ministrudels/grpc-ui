import "./styles.css";

interface Props {
  url: string;
  canSend: boolean;
  sending: boolean;
  elapsed: number;
  onSend: () => void;
  onCancel: () => void;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return ` ${m}:${String(s).padStart(2, "0")}`;
}

export default function AddressBar({ url, canSend, sending, elapsed, onSend, onCancel }: Props) {
  return (
    <div className="address-bar">
      <div className="address-row">
        <input className="address-input" value={url} placeholder="Select a method from the sidebar" readOnly />
        {sending ? (
          <button className="cancel-btn" onClick={onCancel}>Cancel</button>
        ) : (
          <button className="send-btn" disabled={!canSend} onClick={onSend}>Send</button>
        )}
      </div>
      <span className="address-timer">{sending ? formatElapsed(elapsed) : "\u00a0"}</span>
    </div>
  );
}
