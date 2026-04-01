import type { GrpcMethod } from "../../global";
import "./styles.css";

interface Props {
  method: GrpcMethod;
  active: boolean;
  onClick: () => void;
}

/**
 * A single RPC method row in the sidebar.
 * Renders the method name, highlights the active selection, and delegates
 * click events to the parent. Hover styling is handled entirely in CSS.
 */
export default function Method({ method, active, onClick }: Props) {
  return (
    <div
      className={`method${active ? " active" : ""}`}
      title={method.name}
      onClick={onClick}
    >
      {method.name}
    </div>
  );
}
