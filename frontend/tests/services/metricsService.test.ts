import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { apiClient } from "../../src/services/apiClient";
import { getMetrics } from "../../src/services/metricsService";

vi.mock("../../src/services/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const mockedApiClientGet = vi.mocked(apiClient.get);

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

    mockedApiClientGet.mockResolvedValue(metrics);

    const result = await getMetrics(10);

    expect(mockedApiClientGet).toHaveBeenCalledWith(
      "/api/v1/metrics?endpointId=10&limit=20",
    );

    expect(result).toEqual(metrics);
  });

  it("should use the provided limit", async () => {
    mockedApiClientGet.mockResolvedValue([]);

    await getMetrics(10, 50);

    expect(mockedApiClientGet).toHaveBeenCalledWith(
      "/api/v1/metrics?endpointId=10&limit=50",
    );
  });

  it("should propagate API errors", async () => {
    const apiError = new Error("API error");

    mockedApiClientGet.mockRejectedValue(apiError);

    await expect(getMetrics(10)).rejects.toThrow("API error");
  });
});