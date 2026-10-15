import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useEndpointHealth } from "../../src/hooks/useEndpointHealth";
import { getEndpointHealth } from "../../src/services/endpointHealthService";

vi.mock("../../src/services/endpointHealthService", () => ({
  getEndpointHealth: vi.fn(),
}));

const mockedGetEndpointHealth = vi.mocked(getEndpointHealth);

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

const mockHealth = [
  {
    endpointId: 1,
    hostname: "DESKTOP-TEST",
    isOnline: true,
    isStale: false,
    latestMetric: {
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
    },
  },
  {
    endpointId: 2,
    hostname: "SERVER-TEST",
    isOnline: true,
    isStale: false,
    latestMetric: {
      id: 2,
      endpointId: 2,
      cpuPercent: 30,
      memoryUsed: 50,
      memoryTotal: 100,
      diskUsed: 60,
      diskTotal: 100,
      netBytesSent: "2048",
      netBytesRecv: "4096",
      collectedAt: new Date().toISOString(),
    },
  },
];

describe("useEndpointHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();

    mockedGetEndpointHealth.mockResolvedValue(mockHealth);
  });

  it("carrega a saúde dos endpoints inicialmente", async () => {
    const { result } = renderHook(() => useEndpointHealth(endpoints));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockedGetEndpointHealth).toHaveBeenCalledTimes(1);
    expect(result.current.health).toEqual(mockHealth);
    expect(result.current.onlineCount).toBe(2);
    expect(result.current.unavailableCount).toBe(0);
    expect(result.current.availability).toBe(100);
    expect(result.current.error).toBeNull();
  });

  it("atualiza a saúde automaticamente a cada 60 segundos", async () => {
    vi.useFakeTimers();

    const { result } = renderHook(() => useEndpointHealth(endpoints));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockedGetEndpointHealth).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(mockedGetEndpointHealth).toHaveBeenCalledTimes(2);
    expect(result.current.loading).toBe(false);
  });
});