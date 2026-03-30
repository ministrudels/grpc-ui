import React from "react";
import type { GrpcMethod } from "../../global";
import "./styles.css";

interface Props {
  method: GrpcMethod;
  active: boolean;
  onClick: () => void;
}

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
