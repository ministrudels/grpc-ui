import { useState } from "react";
import { Copy, Check } from "lucide-react";
import "./styles.css";

interface Props {
  text: string;
  label?: string;
  className?: string;
}

export default function CopyButton({ text, label = "Copy", className }: Props) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className={`copy-btn${copied ? " copied" : ""}${className ? ` ${className}` : ""}`}
      aria-label={copied ? "Copied" : label}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}
