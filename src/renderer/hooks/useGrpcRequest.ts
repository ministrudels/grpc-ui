import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { Tab } from "../App";
import type { NamedCollection } from "../global";

type MutationArgs = {
  tab: Tab;
  col: NamedCollection;
};

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

  const mutation = useMutation<unknown, Error, MutationArgs>({
    mutationFn: async ({ tab, col }) => {
      const tabId = tab.id;
      const isStreaming = tab.method.serverStreaming;

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
        return await window.grpcui.sendRequest(
          {
            url: tab.collectionUrl,
            serviceName: tab.service.name,
            methodName: tab.method.name,
            requestType: tab.method.requestType,
            responseType: tab.method.responseType,
            requestJson: tab.requestBody,
            fileDescriptors: col.fileDescriptors,
            metadata: tab.metadata,
            serverStreaming: isStreaming
          },
          tabId
        );
      } finally {
        unsubscribe?.();
      }
    },
    onMutate: ({ tab }) => {
      updateTab(tab.id, { sending: true, response: null, streamTimestamps: [], responseError: null, status: "sending" });
    },
    onSuccess: (data, { tab }) => {
      updateTab(tab.id, { response: data, status: "success" });
    },
    onError: (err, { tab }) => {
      const msg = err.message ?? "Request failed";
      updateTab(tab.id, {
        responseError: msg.includes("Cancelled") ? "Request cancelled." : msg,
        status: "error"
      });
    },
    onSettled: (_data, _err, { tab }) => {
      updateTab(tab.id, { sending: false });
    }
  });

  // Elapsed timer — driven by the active tab's sending state, not the shared mutation
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

  function send(): void {
    if (!activeTab || mutation.isPending) return;
    const col = collections.find((c) => c.url === activeTab.collectionUrl);
    if (!col?.fileDescriptors?.length) {
      updateTab(activeTab.id, { responseError: "No schema available — resync the collection first." });
      return;
    }
    mutation.mutate({ tab: activeTab, col });
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
