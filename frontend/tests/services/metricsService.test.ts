
import { describe, expect, it, vi, beforeEach } from "vitest";

import { apiClient } from "../../src/services/apiClient";
import { getMetrics } from "../../src/services/metricsService";

vi.mock("../../src/services/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe("metricsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch metrics for an endpoint", async () => {
    const metrics = [
      {
        id: 1,
        endpointId: 10,
        cpuPercent: 45,
        memoryUsed: 60,
        memoryTotal: 100,
        diskUsed: 30,
        diskTotal: 100,
        netBytesSent: "1000",
        netBytesRecv: "2000",
        collectedAt: "2026-09-19T10:00:00.000Z",
      },
    ];

    vi.mocked(apiClient.get).mockResolvedValue(metrics);

    const result = await getMetrics(10);

    expect(apiClient.get).toHaveBeenCalledWith(
      "/api/v1/metrics?endpointId=10&limit=20",
    );
    expect(result).toEqual(metrics);
  });

  it("should use the provided limit", async () => {
    vi.mocked(apiClient.get).mockResolvedValue([]);

    await getMetrics(10, 50);

    expect(apiClient.get).toHaveBeenCalledWith(
      "/api/v1/metrics?endpointId=10&limit=50",
    );
  });
});