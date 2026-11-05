import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAlertHistory } from "../../src/services/alertsService";
import { apiClient } from "../../src/services/apiClient";
import { getRecentFileEvents } from "../../src/services/fileEventsService";
import { getMetrics } from "../../src/services/metricsService";

vi.mock("../../src/services/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const mockedApiClientGet = vi.mocked(apiClient.get);

describe("filtros de histórico", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedApiClientGet.mockResolvedValue([]);
  });

  it("envia o período ao buscar métricas", async () => {
    await getMetrics(3, 120, {
      from: new Date("2026-11-05T10:00:00.000Z"),
      to: new Date("2026-11-05T11:00:00.000Z"),
    });

    expect(mockedApiClientGet).toHaveBeenCalledWith(
      "/api/v1/metrics?endpointId=3&limit=120&from=2026-11-05T10%3A00%3A00.000Z&to=2026-11-05T11%3A00%3A00.000Z",
    );
  });

  it("filtra eventos de arquivo pelo endpoint", async () => {
    await getRecentFileEvents(20, 7);

    expect(mockedApiClientGet).toHaveBeenCalledWith(
      "/api/v1/file-events?limit=20&endpointId=7",
    );
  });

  it("busca o histórico de alertas resolvidos", async () => {
    await getAlertHistory();

    expect(mockedApiClientGet).toHaveBeenCalledWith(
      "/api/v1/alerts?status=resolved&limit=50",
    );
  });
});
