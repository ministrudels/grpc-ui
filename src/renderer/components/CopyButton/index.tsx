import { useState } from "react";
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
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
