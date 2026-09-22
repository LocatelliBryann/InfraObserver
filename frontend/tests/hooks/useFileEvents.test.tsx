import { act, renderHook, waitFor } from "@testing-library/react";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { useFileEvents } from "../../src/hooks/useFileEvents";

import { getRecentFileEvents } from "../../src/services/fileEventsService";

vi.mock("../../src/services/fileEventsService", () => ({
  getRecentFileEvents: vi.fn(),
}));

const mockedGetRecentFileEvents = vi.mocked(getRecentFileEvents);

const fileEvents = [
  {
    id: 1,
    endpointId: 10,
    username: "admin",
    eventType: "created",
    filePath: "C:\\Users\\admin\\documento.txt",
    occurredAt: "2026-09-22T10:00:00.000Z",
    receivedAt: "2026-09-22T10:00:01.000Z",
    endpoint: {
      hostname: "DESKTOP-TEST",
    },
  },
];

describe("useFileEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("deve carregar os eventos recentes", async () => {
    mockedGetRecentFileEvents.mockResolvedValue(fileEvents);

    const { result } = renderHook(() => useFileEvents());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.fileEvents).toEqual(fileEvents);
    expect(result.current.error).toBeNull();
    expect(mockedGetRecentFileEvents).toHaveBeenCalledWith(20);
  });

  it("deve atualizar os eventos manualmente", async () => {
    mockedGetRecentFileEvents.mockResolvedValue(fileEvents);

    const { result } = renderHook(() => useFileEvents());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const updatedFileEvents = [
      {
        ...fileEvents[0],
        id: 2,
        eventType: "modified",
        filePath: "C:\\Users\\admin\\arquivo-atualizado.txt",
      },
    ];

    mockedGetRecentFileEvents.mockResolvedValue(updatedFileEvents);

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.fileEvents).toEqual(updatedFileEvents);
    });

    expect(mockedGetRecentFileEvents).toHaveBeenCalledTimes(2);
    expect(mockedGetRecentFileEvents).toHaveBeenLastCalledWith(20);
    expect(result.current.error).toBeNull();
  });

  it("deve respeitar o limite informado", async () => {
    mockedGetRecentFileEvents.mockResolvedValue(fileEvents);

    renderHook(() => useFileEvents(10));

    await waitFor(() => {
      expect(mockedGetRecentFileEvents).toHaveBeenCalledWith(10);
    });
  });

  it("deve informar erro quando o carregamento falhar", async () => {
    mockedGetRecentFileEvents.mockRejectedValue(new Error("API error"));

    const { result } = renderHook(() => useFileEvents());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.fileEvents).toEqual([]);
    expect(result.current.error).toBe(
      "Não foi possível carregar os eventos recentes.",
    );
  });
});