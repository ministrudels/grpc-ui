import { useState, useEffect } from "react";
import AddCollectionDialog from "../AddCollectionDialog";
import Collection from "../Collection";
import type { GrpcMessage, GrpcMethod, GrpcService, ReflectProgress } from "../../global";
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
  const [resyncing, setResyncing] = useState(0);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [resyncErrors, setResyncErrors] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<ReflectProgress | null>(null);

  const busy = loading || resyncing > 0;

  useEffect(() => {
    const cleanup = window.grpcui.onReflectProgress((p) => setProgress(p));
    return cleanup;
  }, []);

  function handleDelete(url: string) {
    onCollectionsChange(collections.filter((c) => c.url !== url));
  }

  async function handleResync(url: string): Promise<void> {
    const existing = collections.find((c) => c.url === url);
    if (!existing) return;
    setResyncing((n) => n + 1);
    try {
      const fresh = await window.grpcui.connectServer(url);
      onCollectionsChange(collections.map((c) => (c.url === url ? { ...fresh, name: existing.name } : c)));
      setResyncErrors((prev) => {
        const next = { ...prev };
        delete next[url];
        return next;
      });
    } catch (err) {
      setResyncErrors((prev) => ({ ...prev, [url]: (err as Error).message ?? "Failed to resync" }));
    } finally {
      setResyncing((n) => n - 1);
      setProgress(null);
    }
  }

  async function handleConfirm(name: string, url: string) {
    setLoading(true);
    setConnectError(null);
    try {
      const collection = await window.grpcui.connectServer(url);
      onCollectionsChange([...collections, { ...collection, name }]);
    } catch (err) {
      setConnectError((err as Error).message ?? "Failed to connect");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }

  return (
    <div className="sidebar">
      {busy && (
        <div className="sidebar-overlay">
          <div className="sidebar-overlay-content">
            <div className="sidebar-overlay-spinner" />
            {progress && (
              <span className="sidebar-overlay-label">
                {progress.stage === "listing" ? (
                  "Asking server for available services…"
                ) : (
                  <>
                    {`Discovered ${progress.servicesFound} service${progress.servicesFound !== 1 ? "s" : ""}`}
                    <br />
                    Fetching schemas
                    <br />
                    {`${progress.filesFetched} proto files saved · ${progress.pending} reflection requests pending`}
                  </>
                )}
              </span>
            )}
          </div>
        </div>
      )}
      <button className="sidebar-add-btn" onClick={() => setDialogOpen(true)} disabled={busy}>
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

      {dialogOpen && <AddCollectionDialog onClose={() => setDialogOpen(false)} onConfirm={handleConfirm} />}
    </div>
  );
}
