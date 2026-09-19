
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useEndpointHealth } from "../../src/hooks/useEndpointHealth";
import { getMetrics } from "../../src/services/metricsService";

vi.mock("../../src/services/metricsService", () => ({
  getMetrics: vi.fn(),
}));

const mockedGetMetrics = vi.mocked(getMetrics);

const endpoints = [
  {
    id: "1",
    hostname: "DESKTOP-TEST",
    status: "ONLINE",
  },
  {
    id: "2",
    hostname: "SERVER-TEST",
    status: "OFFLINE",
  },
];

const recentMetric = {
  id: 1,
  endpointId: 1,
  cpuPercent: 25,
  memoryUsed: 40,
  memoryTotal: 100,
  diskUsed: 50,
  diskTotal: 100,
  netBytesSent: "1024",
  netBytesRecv: "2048",
  collectedAt: new Date().toISOString(),
};

describe("useEndpointHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();

    mockedGetMetrics.mockResolvedValue([recentMetric]);
  });

  it("carrega a saúde dos endpoints inicialmente", async () => {
    const { result } = renderHook(() => useEndpointHealth(endpoints));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockedGetMetrics).toHaveBeenCalledTimes(2);
    expect(result.current.onlineCount).toBe(2);
    expect(result.current.availability).toBe(100);
  });

  it("atualiza a saúde automaticamente a cada 60 segundos", async () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useEndpointHealth(endpoints));

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(mockedGetMetrics).toHaveBeenCalledTimes(4);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(mockedGetMetrics).toHaveBeenCalledTimes(6);
    expect(result.current.loading).toBe(false);
  });
});