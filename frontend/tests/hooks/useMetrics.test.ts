import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useMetrics } from "../../src/hooks/useMetrics";
import { getMetrics } from "../../src/services/metricsService";

vi.mock("../../src/services/metricsService", () => ({
  getMetrics: vi.fn(),
}));

const mockedGetMetrics = vi.mocked(getMetrics);

describe("useMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve carregar as métricas do endpoint", async () => {
    const metrics = [
      {
        id: 1,
        endpointId: 10,
        cpuPercent: 35.5,
        memoryUsed: 4096,
        memoryTotal: 8192,
        diskUsed: 50000,
        diskTotal: 100000,
        netBytesSent: "1000",
        netBytesRecv: "2000",
        collectedAt: "2026-09-22T10:00:00.000Z",
      },
    ];

    mockedGetMetrics.mockResolvedValue(metrics);

    const { result } = renderHook(() => useMetrics(10));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.metrics).toEqual(metrics);
    expect(result.current.error).toBeNull();
    expect(mockedGetMetrics).toHaveBeenCalledWith(10);
  });

  it("deve informar erro quando o carregamento falhar", async () => {
    mockedGetMetrics.mockRejectedValue(new Error("API error"));

    const { result } = renderHook(() => useMetrics(10));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.metrics).toEqual([]);
    expect(result.current.error).toBe(
      "Não foi possível carregar as métricas.",
    );
  });

  it("não deve buscar métricas quando nenhum endpoint estiver selecionado", () => {
    const { result } = renderHook(() => useMetrics(null));

    expect(result.current.metrics).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(mockedGetMetrics).not.toHaveBeenCalled();
  });
});