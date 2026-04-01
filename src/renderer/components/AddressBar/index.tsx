import "./styles.css";

interface Props {
  url: string;
  canSend: boolean;
  sending: boolean;
  onSend: () => void;
  onCancel: () => void;
}

export default function AddressBar({ url, canSend, sending, onSend, onCancel }: Props) {
  return (
    <div className="address-bar">
      <input
        className="address-input"
        value={url}
        placeholder="Select a method from the sidebar"
        readOnly
      />
      {sending ? (
        <button className="cancel-btn" onClick={onCancel}>Cancel</button>
      ) : (
        <button className="send-btn" disabled={!canSend} onClick={onSend}>Send</button>
      )}
    </div>
  );
}
