import { describe, expect, it, vi, beforeEach } from "vitest";

import { apiClient } from "../../src/services/apiClient";

describe("apiClient", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("deve realizar uma requisição GET para a API", async () => {
    const mockResponse = {
      data: [
        {
          id: "endpoint-1",
          hostname: "DESKTOP-TEST",
          status: "ONLINE",
        },
      ],
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      }),
    );

    const result = await apiClient.get("/api/v1/endpoints");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/endpoints"),
      expect.objectContaining({
        method: "GET",
      }),
    );

    expect(result).toEqual(mockResponse);
  });
});