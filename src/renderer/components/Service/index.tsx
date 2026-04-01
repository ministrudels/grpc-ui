import { useState } from "react";
import Method from "../Method";
import type { GrpcMessage, GrpcService } from "../../global";
import type { SelectedMethod } from "../../App";
import type { OnSelectMethod } from "../Sidebar";
import "./styles.css";

interface Props {
  service: GrpcService;
  collectionUrl: string;
  messages: GrpcMessage[];
  selectedMethod: SelectedMethod | null;
  onSelectMethod: OnSelectMethod;
  query?: string;
}

function fuzzyMatch(query: string, target: string): boolean {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

/**
 * A collapsible service group within a collection.
 * Lists all RPC methods belonging to the service and passes selection events
 * up via onSelectMethod, forwarding the message definitions needed to build
 * a skeleton request body.
 */
export default function Service({ service, collectionUrl, messages, selectedMethod, onSelectMethod, query = "" }: Props) {
  const [open, setOpen] = useState(true);

  const visibleMethods = query
    ? service.methods.filter((m) => fuzzyMatch(query, m.name) || fuzzyMatch(query, service.name))
    : service.methods;

  if (query && visibleMethods.length === 0) return null;

  return (
    <div>
      <div className="service-header" title={service.name} onClick={() => setOpen((o) => !o)}>
        <span className={`service-chevron${open || query ? " open" : ""}`}>▶</span>
        <span className="service-name">{service.name.split(".").pop()}</span>
      </div>

      {(open || query) && visibleMethods.map((method) => (
        <Method
          key={method.name}
          method={method}
          active={
            selectedMethod?.collectionUrl === collectionUrl &&
            selectedMethod?.service.name === service.name &&
            selectedMethod?.method.name === method.name
          }
          onClick={() => onSelectMethod(collectionUrl, service, method, messages)}
        />
      ))}
    </div>
  );
}
