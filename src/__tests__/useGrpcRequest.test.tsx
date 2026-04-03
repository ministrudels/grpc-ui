// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useGrpcRequest } from "../renderer/hooks/useGrpcRequest";
import type { Tab } from "../renderer/App";
import type { NamedCollection } from "../renderer/global";

// ── Mock window.grpcui ────────────────────────────────────────────────────────

const mockSendRequest = vi.fn();
const mockCancelRequest = vi.fn();
const mockOnStreamData = vi.fn(() => () => {});

Object.defineProperty(window, "grpcui", {
  value: {
    sendRequest: mockSendRequest,
    cancelRequest: mockCancelRequest,
    onStreamData: mockOnStreamData,
  },
  writable: true,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTab(id: string, methodName: string, sending = false): Tab {
  return {
    id,
    collectionUrl: "localhost:50051",
    service: { name: "helloworld.Greeter", methods: [] },
    method: {
      name: methodName,
      requestType: "helloworld.HelloRequest",
      responseType: "helloworld.HelloReply",
      clientStreaming: false,
      serverStreaming: true,
    },
    requestBody: "{}",
    metadata: [],
    editorTab: "request",
    response: null,
    streamTimestamps: [],
    responseError: null,
    sending,
    elapsed: 0,
    status: "idle",
  };
}

const col: NamedCollection = {
  url: "localhost:50051",
  name: "Test",
  services: [],
  messages: [],
  fileDescriptors: ["AAAA"],
};

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("useGrpcRequest — concurrent streaming", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Hang forever so the first mutation stays pending while we test the second
    mockSendRequest.mockImplementation(() => new Promise(() => {}));
  });

  it("allows a second tab to send while a different tab's request is in-flight", async () => {
    const tab1 = makeTab("tab1", "SayHelloStream");
    const tab2 = makeTab("tab2", "SayHelloStream2");
    const updateTab = vi.fn();
    const setTabs = vi.fn();

    const { result, rerender } = renderHook(
      ({ activeTab }: { activeTab: Tab }) =>
        useGrpcRequest(activeTab, [col], updateTab, setTabs),
      { wrapper: makeWrapper(), initialProps: { activeTab: tab1 } }
    );

    // Send on tab1 — mutation fires, sendRequest called once
    await act(async () => { result.current.send(); });
    expect(mockSendRequest).toHaveBeenCalledTimes(1);

    // Simulate tab1 now sending (as onMutate would set it)
    const tab1Sending = { ...tab1, sending: true };
    rerender({ activeTab: { ...tab2, sending: false } });
    // Ensure tab1 is reflected as sending in collections passed as context
    rerender({ activeTab: tab2 });

    // Send on tab2 — should fire a second independent request
    await act(async () => { result.current.send(); });

    // BUG: mutation.isPending blocks the second send, so this assertion fails
    expect(mockSendRequest).toHaveBeenCalledTimes(2);
  });
});
