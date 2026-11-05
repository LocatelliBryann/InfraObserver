import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "../../src/services/apiClient";
import { getActiveAlerts } from "../../src/services/alertsService";

vi.mock("../../src/services/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const mockedApiClient = vi.mocked(apiClient);

describe("alertsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("consulta os alertas ativos pela API", async () => {
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

    mockedApiClient.get.mockResolvedValue(alerts);

    const result = await getActiveAlerts();

    expect(mockedApiClient.get).toHaveBeenCalledWith("/api/v1/alerts");
    expect(result).toEqual(alerts);
  });

  it("propaga erros da API", async () => {
    const error = new Error("Erro na requisição");

    mockedApiClient.get.mockRejectedValue(error);

    await expect(getActiveAlerts()).rejects.toThrow(
      "Erro na requisição",
    );
  });
});