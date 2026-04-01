import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import Service from "../Service";
import type { GrpcMessage, GrpcService } from "../../global";
import type { SelectedMethod } from "../../App";
import type { OnSelectMethod } from "../Sidebar";
import "./styles.css";

interface CollectionData {
  url: string;
  name: string;
  services: GrpcService[];
  messages: GrpcMessage[];
}

interface Props {
  collection: CollectionData;
  selectedMethod: SelectedMethod | null;
  onSelectMethod: OnSelectMethod;
  onResync: (url: string) => Promise<void>;
  onDelete: (url: string) => void;
  error?: string | null;
  query?: string;
}

/**
 * A collapsible collection header that groups one or more gRPC services
 * discovered from a single server URL. Includes a resync button (↻) and a
 * trash button that prompts for confirmation before deleting the collection.
 */
export default function Collection({ collection, selectedMethod, onSelectMethod, onResync, onDelete, error, query = "" }: Props) {
  const [open, setOpen] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);
  const resyncRef = useRef<HTMLButtonElement>(null);

  async function handleResync(e: React.MouseEvent) {
    e.stopPropagation();
    if (syncing) return;
    setSyncing(true);
    try {
      await onResync(collection.url);
    } finally {
      setSyncing(false);
    }
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (window.confirm(`Delete "${collection.name}"?`)) {
      onDelete(collection.url);
    }
  }

  function showTooltip() {
    if (resyncRef.current) {
      const rect = resyncRef.current.getBoundingClientRect();
      setTooltipPos({ top: rect.bottom + 6, left: rect.left + rect.width / 2 });
    }
  }

  function hideTooltip() {
    setTooltipPos(null);
  }

  return (
    <div>
      <div className="collection-header" title={collection.url} onClick={() => setOpen((o) => !o)}>
        <span className={`collection-chevron${open ? " open" : ""}`}>▶</span>
        <span className="collection-name">{collection.name}</span>
        <div className="collection-actions">
          <button
            ref={resyncRef}
            className={`resync-btn${syncing ? " syncing" : ""}`}
            disabled={syncing}
            onClick={handleResync}
            onMouseEnter={showTooltip}
            onMouseLeave={hideTooltip}
          >
            ↻
          </button>
          {tooltipPos &&
            createPortal(
              <div className="resync-tooltip" style={{ top: tooltipPos.top, left: tooltipPos.left }}>
                <strong>Resync collection</strong>
                <span>
                  Re-runs gRPC reflection against
                  <br />
                  {collection.url}
                  <br />
                  to pick up any new or changed services.
                </span>
              </div>,
              document.body
            )}
          <button className="delete-btn" title="Delete collection" onClick={handleDelete}>
            🗑
          </button>
        </div>
      </div>

      {error && <span className="collection-error">{error}</span>}

      {(open || query) &&
        collection.services.map((svc) => (
          <Service
            key={svc.name}
            service={svc}
            collectionUrl={collection.url}
            messages={collection.messages}
            selectedMethod={selectedMethod}
            onSelectMethod={onSelectMethod}
            query={query}
          />
        ))}
    </div>
  );
}
