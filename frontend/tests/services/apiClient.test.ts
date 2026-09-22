import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

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
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      }),
    );

    expect(result).toEqual(mockResponse);
  });

  it("deve realizar uma requisição POST com body JSON", async () => {
    const requestBody = {
      hostname: "SERVER-TEST",
      ipAddress: "192.168.1.10",
    };

    const mockResponse = {
      id: 1,
      ...requestBody,
    };

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockResponse),
      }),
    );

    const result = await apiClient.post(
      "/api/v1/endpoints/register",
      requestBody,
    );

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/endpoints/register"),
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }),
    );

    expect(result).toEqual(mockResponse);
  });

  it("deve lançar erro quando a API retornar status HTTP inválido", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn(),
      }),
    );

    await expect(
      apiClient.get("/api/v1/endpoints"),
    ).rejects.toThrow("Erro na requisição: 500");
  });
});