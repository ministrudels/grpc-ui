import { useEffect, useRef } from "react";
import type { GrpcMethod } from "../../global";
import type { TabStatus } from "../../App";
import "./styles.css";

interface Props {
  method: GrpcMethod;
  active: boolean;
  tabStatus: TabStatus | null;
  onClick: () => void;
}

function methodBadge(method: GrpcMethod): { label: string; className: string } {
  if (method.clientStreaming && method.serverStreaming) return { label: "BIDI", className: "badge-bidi" };
  if (method.clientStreaming) return { label: "CS", className: "badge-client" };
  if (method.serverStreaming) return { label: "SS", className: "badge-server" };
  return { label: "U", className: "badge-unary" };
}

export default function Method({ method, active, tabStatus, onClick }: Props) {
  const badge = methodBadge(method);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [active]);

  return (
    <div
      ref={ref}
      className={`method${active ? " active" : ""}`}
      onClick={onClick}
    >
      <span className={`method-badge ${badge.className}`}>{badge.label}</span>
      <span className="method-name">{method.name}</span>
      {tabStatus && tabStatus !== "idle" && (
        <span className={`method-status method-status-${tabStatus}`} />
      )}
    </div>
  );
}
