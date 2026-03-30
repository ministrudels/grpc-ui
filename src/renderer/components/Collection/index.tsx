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
}

export default function Collection({ collection, selectedMethod, onSelectMethod, onResync }: Props) {
  const [open, setOpen] = useState(true);
  const [syncing, setSyncing] = useState(false);

  function handleResync(e: React.MouseEvent) {
    e.stopPropagation();
    setSyncing(true);
    onResync(collection.url);
    setTimeout(() => setSyncing(false), 600);
  }

  return (
    <div>
      <div className="collection-header" title={collection.url} onClick={() => setOpen((o) => !o)}>
        <span className={`collection-chevron${open ? " open" : ""}`}>▶</span>
        <span className="collection-name">{collection.name}</span>
        <button
          className={`resync-btn${syncing ? " syncing" : ""}`}
          title={`Resync ${collection.url}`}
          onClick={handleResync}
        >
          ↻
        </button>
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
