import "./styles.css";

export type MetadataRow = { key: string; value: string };

interface Props {
  rows: MetadataRow[];
  onChange: (rows: MetadataRow[]) => void;
}

export default function MetadataEditor({ rows, onChange }: Props) {
  function updateRow(index: number, field: "key" | "value", val: string) {
    const next = rows.map((r, i) => (i === index ? { ...r, [field]: val } : r));
    onChange(next);
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  function addRow() {
    onChange([...rows, { key: "", value: "" }]);
  }

  return (
    <div className="metadata-editor">
      <div className="metadata-header">
        <span>Key</span>
        <span>Value</span>
      </div>
      <div className="metadata-rows">
        {rows.map((row, i) => (
          <div key={i} className="metadata-row">
            <input
              className="metadata-input"
              placeholder="e.g. authorization"
              value={row.key}
              onChange={(e) => updateRow(i, "key", e.target.value)}
              spellCheck={false}
            />
            <input
              className="metadata-input"
              placeholder="e.g. Bearer token"
              value={row.value}
              onChange={(e) => updateRow(i, "value", e.target.value)}
              spellCheck={false}
            />
            <button className="metadata-remove" onClick={() => removeRow(i)} title="Remove">×</button>
          </div>
        ))}
      </div>
      <button className="metadata-add" onClick={addRow}>+ Add</button>
    </div>
  );
}
