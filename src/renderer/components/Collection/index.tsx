import React, { useState } from "react";
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
  onResync: (url: string) => void;
  onDelete: (url: string) => void;
}

/**
 * A collapsible collection header that groups one or more gRPC services
 * discovered from a single server URL. Includes a resync button (↻) and a
 * trash button that prompts for confirmation before deleting the collection.
 */
export default function Collection({ collection, selectedMethod, onSelectMethod, onResync, onDelete }: Props) {
  const [open, setOpen] = useState(true);
  const [syncing, setSyncing] = useState(false);

  function handleResync(e: React.MouseEvent) {
    e.stopPropagation();
    setSyncing(true);
    onResync(collection.url);
    setTimeout(() => setSyncing(false), 600);
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (window.confirm(`Delete "${collection.name}"?`)) {
      onDelete(collection.url);
    }
  }

  return (
    <div>
      <div className="collection-header" title={collection.url} onClick={() => setOpen((o) => !o)}>
        <span className={`collection-chevron${open ? " open" : ""}`}>▶</span>
        <span className="collection-name">{collection.name}</span>
        <div className="collection-actions">
          <button
            className={`resync-btn${syncing ? " syncing" : ""}`}
            title={`Resync ${collection.url}`}
            onClick={handleResync}
          >
            ↻
          </button>
          <button className="delete-btn" title="Delete collection" onClick={handleDelete}>
            🗑
          </button>
        </div>
      </div>

      {open && collection.services.map((svc) => (
        <Service
          key={svc.name}
          service={svc}
          collectionUrl={collection.url}
          messages={collection.messages}
          selectedMethod={selectedMethod}
          onSelectMethod={onSelectMethod}
        />
      ))}
    </div>
  );
}
