import type { GrpcMethod } from "../../global";
import "./styles.css";

interface Props {
  method: GrpcMethod;
  active: boolean;
  onClick: () => void;
}

function methodBadge(method: GrpcMethod): { label: string; className: string } {
  if (method.clientStreaming && method.serverStreaming) return { label: "BIDI", className: "badge-bidi" };
  if (method.clientStreaming) return { label: "CS", className: "badge-client" };
  if (method.serverStreaming) return { label: "SS", className: "badge-server" };
  return { label: "U", className: "badge-unary" };
}

export default function Method({ method, active, onClick }: Props) {
  const badge = methodBadge(method);
  return (
    <div
      className={`method${active ? " active" : ""}`}
      onClick={onClick}
    >
      <span className={`method-badge ${badge.className}`}>{badge.label}</span>
      <span className="method-name">{method.name}</span>
    </div>
  );
}
