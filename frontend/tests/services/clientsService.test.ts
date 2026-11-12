import { afterEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "../../src/services/apiClient";
import {
  clientsService,
  enrollmentTokenStatus,
} from "../../src/services/clientsService";
import { endpointsService } from "../../src/services/endpointsService";

vi.mock("../../src/services/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("clientsService", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lista e cadastra clientes", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [{ id: 1, name: "A" }] });

    expect(await clientsService.getClients()).toEqual([{ id: 1, name: "A" }]);
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/clients");

    await clientsService.createClient("Contabilidade Silva");

    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/clients", {
      name: "Contabilidade Silva",
    });
  });

  it("lista, gera e revoga tokens de instalação", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] });

    await clientsService.getEnrollmentTokens(3);
    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/clients/3/enrollment-tokens");

    await clientsService.createEnrollmentToken(3);
    expect(apiClient.post).toHaveBeenLastCalledWith(
      "/api/v1/clients/3/enrollment-tokens",
      {},
    );

    await clientsService.createEnrollmentToken(3, 30);
    expect(apiClient.post).toHaveBeenLastCalledWith(
      "/api/v1/clients/3/enrollment-tokens",
      { expiresInDays: 30 },
    );

    await clientsService.revokeEnrollmentToken(3, 9);
    expect(apiClient.post).toHaveBeenLastCalledWith(
      "/api/v1/clients/3/enrollment-tokens/9/revoke",
    );
  });

  it("revoga o acesso de um endpoint", async () => {
    await endpointsService.revokeEndpoint(7);

    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/endpoints/7/revoke");
  });
});

describe("enrollmentTokenStatus", () => {
  const now = new Date("2026-11-10T12:00:00Z");

  it("diferencia tokens ativos, revogados e expirados", () => {
    expect(enrollmentTokenStatus({ revokedAt: null, expiresAt: null }, now)).toBe("active");
    expect(
      enrollmentTokenStatus({ revokedAt: null, expiresAt: "2026-11-11T00:00:00Z" }, now),
    ).toBe("active");
    expect(
      enrollmentTokenStatus({ revokedAt: null, expiresAt: "2026-11-10T12:00:00Z" }, now),
    ).toBe("expired");
    expect(
      enrollmentTokenStatus(
        { revokedAt: "2026-11-09T00:00:00Z", expiresAt: "2026-11-01T00:00:00Z" },
        now,
      ),
    ).toBe("revoked");
  });
});
