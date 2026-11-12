import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { describeClientError, useClients } from "../../src/hooks/useClients";
import { ApiError } from "../../src/services/apiClient";
import { clientsService } from "../../src/services/clientsService";

vi.mock("../../src/services/clientsService", () => ({
  clientsService: {
    getClients: vi.fn(),
    createClient: vi.fn(),
  },
}));

const client = {
  id: 1,
  name: "Contabilidade Silva",
  createdAt: "2026-11-10T12:00:00Z",
  endpointCount: 0,
  activeTokenCount: 0,
};

describe("useClients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(clientsService.getClients).mockResolvedValue([client]);
    vi.mocked(clientsService.createClient).mockResolvedValue(client);
  });

  it("carrega os clientes", async () => {
    const { result } = renderHook(() => useClients());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.clients).toEqual([client]);
    expect(result.current.error).toBeNull();
  });

  it("cadastra e recarrega a lista", async () => {
    const { result } = renderHook(() => useClients());

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createClient("Contabilidade Silva");
    });

    expect(clientsService.createClient).toHaveBeenCalledWith("Contabilidade Silva");
    expect(clientsService.getClients).toHaveBeenCalledTimes(2);
  });

  it("mostra um erro quando a API falha", async () => {
    vi.mocked(clientsService.getClients).mockRejectedValue(new Error("falhou"));

    const { result } = renderHook(() => useClients());

    await waitFor(() =>
      expect(result.current.error).toBe("Não foi possível carregar os clientes."),
    );
  });
});

describe("describeClientError", () => {
  it("traduz os erros da API", () => {
    expect(describeClientError(new ApiError(409))).toBe(
      "Já existe um cliente com esse nome.",
    );
    expect(describeClientError(new ApiError(400))).toContain("entre 2 e 100");
    expect(describeClientError(new Error("rede"))).toBe(
      "Não foi possível salvar. Tente de novo.",
    );
  });
});
