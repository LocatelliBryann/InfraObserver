import { act, renderHook, waitFor } from "@testing-library/react";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAlerts } from "../../src/hooks/useAlerts";

import { getActiveAlerts } from "../../src/services/alertsService";

vi.mock("../../src/services/alertsService", () => ({
  getActiveAlerts: vi.fn(),
}));

const mockedGetActiveAlerts = vi.mocked(getActiveAlerts);

const alerts = [
  {
    id: 1,
    endpointId: 10,
    metricId: 20,
    metricType: "CPU",
    thresholdValue: 80,
    severity: "HIGH",
    triggeredAt: "2026-09-19T18:00:00.000Z",
    resolvedAt: null,
  },
];

describe("useAlerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    mockedGetActiveAlerts.mockResolvedValue(alerts);
  });

  it("carrega os alertas inicialmente", async () => {
    const { result } = renderHook(() => useAlerts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockedGetActiveAlerts).toHaveBeenCalledTimes(1);
    expect(result.current.alerts).toEqual(alerts);
    expect(result.current.error).toBeNull();
  });

  it("atualiza os alertas manualmente", async () => {
    const { result } = renderHook(() => useAlerts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockedGetActiveAlerts).toHaveBeenCalledTimes(2);
    expect(result.current.alerts).toEqual(alerts);
    expect(result.current.error).toBeNull();
  });

  it("atualiza os alertas automaticamente a cada 60 segundos", async () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useAlerts());

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(mockedGetActiveAlerts).toHaveBeenCalledTimes(2);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(mockedGetActiveAlerts).toHaveBeenCalledTimes(3);
    expect(result.current.loading).toBe(false);
  });

  it("retorna erro quando a consulta falha", async () => {
    mockedGetActiveAlerts.mockRejectedValue(
      new Error("Erro na requisição"),
    );

    const { result } = renderHook(() => useAlerts());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.alerts).toEqual([]);
    expect(result.current.error).toBe(
      "Não foi possível carregar os alertas.",
    );
  });
});