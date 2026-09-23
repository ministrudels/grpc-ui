import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Check } from "lucide-react";
import "./styles.css";

interface TooltipProps {
  text: string;
  top: number;
  left: number;
}

const TOOLTIP_MARGIN = 8;

function Tooltip({ text, top, left }: TooltipProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shift, setShift] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const overflowRight = rect.right - (window.innerWidth - TOOLTIP_MARGIN);
    const overflowLeft = TOOLTIP_MARGIN - rect.left;
    if (overflowRight > 0) setShift(-overflowRight);
    else if (overflowLeft > 0) setShift(overflowLeft);
    else setShift(0);
  }, [text, top, left]);

  return createPortal(
    <div
      ref={ref}
      className="copy-btn-tooltip"
      style={{ top, left, transform: `translateX(calc(-50% + ${shift}px))` }}
    >
      {text}
    </div>,
    document.body
  );
}

interface Props {
  text: string;
  label?: string;
  tooltip?: string;
  className?: string;
}

export default function CopyButton({ text, label = "Copy", tooltip, className }: Props) {
  const [copied, setCopied] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  function showTooltip() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setTooltipPos({ top: rect.bottom + 6, left: rect.left + rect.width / 2 });
    }
  }

  function hideTooltip() {
    setTooltipPos(null);
  }

  return (
    <>
      <button
        ref={btnRef}
        className={`copy-btn${copied ? " copied" : ""}${className ? ` ${className}` : ""}`}
        aria-label={copied ? "Copied" : label}
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        }}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
      {tooltip && tooltipPos && <Tooltip text={tooltip} top={tooltipPos.top} left={tooltipPos.left} />}
    </>
  );
}
