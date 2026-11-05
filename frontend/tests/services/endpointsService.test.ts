import { afterEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "../../src/services/apiClient";
import { endpointsService } from "../../src/services/endpointsService";

vi.mock("../../src/services/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe("endpointsService", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("deve buscar os endpoints da API", async () => {
    const mockEndpoints = [
      {
        id: "endpoint-1",
        hostname: "DESKTOP-TEST",
        status: "ONLINE",
      },
    ];

    vi.mocked(apiClient.get).mockResolvedValue({
      data: mockEndpoints,
    });

    const result = await endpointsService.getEndpoints();

    expect(apiClient.get).toHaveBeenCalledWith(
      "/api/v1/endpoints",
    );

    expect(result).toEqual(mockEndpoints);
  });
});