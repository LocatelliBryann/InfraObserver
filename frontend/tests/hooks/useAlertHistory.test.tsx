import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAlertHistory } from "../../src/hooks/useAlertHistory";
import { getAlertHistory } from "../../src/services/alertsService";

vi.mock("../../src/services/alertsService", () => ({
  getAlertHistory: vi.fn(),
}));

const mockedGetAlertHistory = vi.mocked(getAlertHistory);

const resolvedAlert = {
  id: 1,
  endpointId: 1,
  metricId: 10,
  metricType: "CPU",
  thresholdValue: 80,
  severity: "HIGH",
  triggeredAt: "2026-11-05T10:00:00.000Z",
  resolvedAt: "2026-11-05T10:05:00.000Z",
};

describe("useAlertHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("carrega os alertas resolvidos", async () => {
    mockedGetAlertHistory.mockResolvedValue([resolvedAlert]);

    const { result } = renderHook(() => useAlertHistory());

    await waitFor(() => {
      expect(result.current.history).toEqual([resolvedAlert]);
    });

    expect(mockedGetAlertHistory).toHaveBeenCalledWith(50);
    expect(result.current.error).toBeNull();
  });

  it("retorna erro quando a consulta falha", async () => {
    mockedGetAlertHistory.mockRejectedValue(new Error("falha"));

    const { result } = renderHook(() => useAlertHistory());

    await waitFor(() => {
      expect(result.current.error).toBe(
        "Não foi possível carregar o histórico de alertas.",
      );
    });

    expect(result.current.history).toEqual([]);
  });

  it("atualiza o histórico a cada 30 segundos", async () => {
    vi.useFakeTimers();
    mockedGetAlertHistory.mockResolvedValue([]);

    renderHook(() => useAlertHistory());

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockedGetAlertHistory).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(mockedGetAlertHistory).toHaveBeenCalledTimes(2);
  });
});
