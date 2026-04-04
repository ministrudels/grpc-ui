import { useEffect, useState } from "react";
import type { Tab } from "../App";
import type { NamedCollection } from "../global";

export type UseGrpcRequestReturn = {
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  elapsed: number;
  send: () => void;
  cancel: () => void;
};

export function useGrpcRequest(
  activeTab: Tab | null,
  collections: NamedCollection[],
  updateTab: (id: string, patch: Partial<Tab>) => void,
  setTabs: React.Dispatch<React.SetStateAction<Tab[]>>
): UseGrpcRequestReturn {
  const [elapsed, setElapsed] = useState(0);

  // Elapsed timer — per-tab, resets when the active tab changes or stops sending
  const tabSending = activeTab?.sending ?? false;
  useEffect(() => {
    if (!tabSending) {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 250);
    return () => clearInterval(id);
  }, [tabSending, activeTab?.id]);

  async function send(): Promise<void> {
    if (!activeTab || activeTab.sending) return;
    const tabId = activeTab.id;
    const col = collections.find((c) => c.url === activeTab.collectionUrl);
    if (!col?.fileDescriptors?.length) {
      updateTab(tabId, { responseError: "No schema available — resync the collection first." });
      return;
    }

    const isStreaming = activeTab.method.serverStreaming;
    updateTab(tabId, { sending: true, response: null, streamTimestamps: [], responseError: null, responseErrorTs: null, status: "sending" });

    let unsubscribe: (() => void) | null = null;
    if (isStreaming) {
      unsubscribe = window.grpcui.onStreamData(({ requestId, data }) => {
        if (requestId !== tabId) return;
        const ts = Date.now();
        setTabs((prev) =>
          prev.map((t) => {
            if (t.id !== tabId) return t;
            const existing = Array.isArray(t.response) ? (t.response as unknown[]) : [];
            return { ...t, response: [...existing, data], streamTimestamps: [...t.streamTimestamps, ts] };
          })
        );
      });
    }

    try {
      const res = await window.grpcui.sendRequest(
        {
          url: activeTab.collectionUrl,
          serviceName: activeTab.service.name,
          methodName: activeTab.method.name,
          requestType: activeTab.method.requestType,
          responseType: activeTab.method.responseType,
          requestJson: activeTab.requestBody,
          fileDescriptors: col.fileDescriptors,
          metadata: activeTab.metadata,
          serverStreaming: isStreaming
        },
        tabId
      );
      updateTab(tabId, { response: res, status: "success" });
    } catch (err: unknown) {
      const msg = (err as Error).message ?? "Request failed";
      updateTab(tabId, {
        responseError: msg.includes("Cancelled") ? "Request cancelled." : msg,
        responseErrorTs: Date.now(),
        status: "error"
      });
    } finally {
      unsubscribe?.();
      updateTab(tabId, { sending: false });
    }
  }

  function cancel(): void {
    if (activeTab) window.grpcui.cancelRequest(activeTab.id);
  }

  return {
    isPending: activeTab?.sending ?? false,
    isSuccess: activeTab?.status === "success",
    isError: activeTab?.status === "error",
    elapsed,
    send,
    cancel
  };
}
