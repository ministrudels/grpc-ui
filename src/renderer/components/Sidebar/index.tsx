import React, { useState } from "react";
import AddCollectionDialog from "../AddCollectionDialog";
import Collection from "../Collection";
import type { GrpcMessage, GrpcMethod, GrpcService } from "../../global";
import type { NamedCollection } from "../../global";
import type { SelectedMethod } from "../../App";
import "./styles.css";

export type OnSelectMethod = (
  collectionUrl: string,
  service: GrpcService,
  method: GrpcMethod,
  messages: GrpcMessage[]
) => void;

interface Props {
  collections: NamedCollection[];
  onCollectionsChange: (next: NamedCollection[]) => void;
  selectedMethod: SelectedMethod | null;
  onSelectMethod: OnSelectMethod;
}

/**
 * Left-hand navigation panel. Owns the "Add Collection" flow — prompts for
 * a name and server URL, calls window.grpcui.connectServer via gRPC
 * reflection, and notifies the parent of collection changes so they are
 * persisted to localStorage. Renders a Collection tree for each saved server.
 */
export default function Sidebar({ collections, onCollectionsChange, selectedMethod, onSelectMethod }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [resyncErrors, setResyncErrors] = useState<Record<string, string>>({});

  function handleDelete(url: string) {
    onCollectionsChange(collections.filter((c) => c.url !== url));
  }

  function handleResync(url: string) {
    const existing = collections.find((c) => c.url === url);
    if (!existing) return;
    window.grpcui
      .connectServer(url)
      .then((fresh) => {
        onCollectionsChange(
          collections.map((c) => (c.url === url ? { ...fresh, name: existing.name } : c))
        );
      })
      .then(() => setResyncErrors((prev) => { const next = { ...prev }; delete next[url]; return next; }))
      .catch((err: Error) => setResyncErrors((prev) => ({ ...prev, [url]: err.message ?? "Failed to resync" })));
  }

  function handleConfirm(name: string, url: string) {
    setLoading(true);
    setConnectError(null);
    window.grpcui
      .connectServer(url)
      .then((collection) => {
        onCollectionsChange([...collections, { ...collection, name }]);
      })
      .catch((err: Error) => setConnectError(err.message ?? "Failed to connect"))
      .finally(() => setLoading(false));
  }

  return (
    <div className="sidebar">
      <button
        className="sidebar-add-btn"
        onClick={() => setDialogOpen(true)}
        disabled={loading}
      >
        {loading ? (
          <span className="sidebar-spinner">
            <span className="sidebar-spinner-icon" />
            Connecting…
          </span>
        ) : (
          "+ Add Collection"
        )}
      </button>

      {connectError && <span className="sidebar-error">{connectError}</span>}

      {collections.length === 0 && !loading && (
        <span>Collections will appear here</span>
      )}

      {collections.map((col) => (
        <Collection
          key={col.url}
          collection={col}
          selectedMethod={selectedMethod}
          onSelectMethod={onSelectMethod}
          onResync={handleResync}
          onDelete={handleDelete}
          error={resyncErrors[col.url]}
        />
      ))}

      {dialogOpen && (
        <AddCollectionDialog
          onClose={() => setDialogOpen(false)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  );
}
