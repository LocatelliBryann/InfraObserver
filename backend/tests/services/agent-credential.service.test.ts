import { describe, expect, it, vi } from "vitest";

import {
  AgentCredentialService,
  EndpointNotFoundError,
  EndpointOwnedByAnotherClientError,
  InvalidEnrollmentTokenError,
} from "../../src/services/agent-credential.service";
import { hashToken } from "../../src/security/agent-tokens";

const NOW = new Date("2026-11-10T12:00:00.000Z");
const AGENT_ID = "550e8400-e29b-41d4-a716-446655440020";
const INSTALL_TOKEN = "ioe_token-de-instalacao";

const input = {
  agentId: AGENT_ID,
  hostname: "PC-RECEPCAO",
  ipAddress: "192.168.0.20",
  osName: "Windows",
  osVersion: "11",
  agentVersion: "1.7.0",
};

function endpoint(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    agentId: AGENT_ID,
    hostname: "PC-RECEPCAO",
    ipAddress: "192.168.0.20",
    osName: "Windows",
    osVersion: "11",
    agentVersion: "1.6.1",
    status: "ONLINE",
    lastSeenAt: NOW,
    clientId: null,
    credentialIssuedAt: null,
    credentialRevokedAt: null,
    ...overrides,
  };
}

function enrollmentToken(overrides: Record<string, unknown> = {}) {
  return {
    id: 3,
    clientId: 1,
    prefix: "ioe_token-de",
    createdAt: NOW,
    expiresAt: null,
    revokedAt: null,
    lastUsedAt: null,
    usageCount: 0,
    ...overrides,
  };
}

function createService() {
  const endpoints = {
    findAll: vi.fn(),
    findById: vi.fn().mockResolvedValue(endpoint()),
    findByAgentId: vi.fn().mockResolvedValue(null),
    findByCredentialHash: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation(async (data) => endpoint({ ...data, id: 11 })),
    update: vi.fn().mockImplementation(async (id, data) => endpoint({ id, ...data })),
    findOnlineNotSeenSince: vi.fn(),
  };
  const tokens = {
    create: vi.fn(),
    findByHash: vi.fn().mockResolvedValue(enrollmentToken()),
    findById: vi.fn(),
    findByClientId: vi.fn(),
    revoke: vi.fn(),
    registerUse: vi.fn(),
  };

  return {
    endpoints,
    tokens,
    service: new AgentCredentialService(endpoints, tokens, () => NOW),
  };
}

describe("AgentCredentialService.enroll", () => {
  it("creates the endpoint with the client and a new credential", async () => {
    const { endpoints, tokens, service } = createService();

    const { credential, endpoint: created } = await service.enroll(
      INSTALL_TOKEN,
      input,
    );

    expect(tokens.findByHash).toHaveBeenCalledWith(hashToken(INSTALL_TOKEN));
    expect(credential).toMatch(/^ioa_[A-Za-z0-9_-]{43}$/);
    expect(endpoints.create).toHaveBeenCalledWith({
      ...input,
      status: "ONLINE",
      lastSeenAt: NOW,
      clientId: 1,
      credentialHash: hashToken(credential),
      credentialIssuedAt: NOW,
    });
    expect(created.id).toBe(11);
    expect(tokens.registerUse).toHaveBeenCalledWith(3, NOW);
  });

  it("adopts an existing legacy endpoint and clears a revocation", async () => {
    const { endpoints, service } = createService();
    endpoints.findByAgentId.mockResolvedValue(
      endpoint({ credentialRevokedAt: new Date("2026-11-01") }),
    );

    const { credential } = await service.enroll(INSTALL_TOKEN, input);

    expect(endpoints.create).not.toHaveBeenCalled();
    expect(endpoints.update).toHaveBeenCalledWith(
      10,
      expect.objectContaining({
        clientId: 1,
        credentialHash: hashToken(credential),
        credentialRevokedAt: null,
        agentVersion: "1.7.0",
      }),
    );
  });

  it("refuses an endpoint of another client", async () => {
    const { endpoints, tokens, service } = createService();
    endpoints.findByAgentId.mockResolvedValue(endpoint({ clientId: 2 }));

    await expect(service.enroll(INSTALL_TOKEN, input)).rejects.toBeInstanceOf(
      EndpointOwnedByAnotherClientError,
    );
    expect(endpoints.update).not.toHaveBeenCalled();
    expect(tokens.registerUse).not.toHaveBeenCalled();
  });

  it.each([
    ["unknown", null],
    ["revoked", enrollmentToken({ revokedAt: new Date("2026-11-09") })],
    ["expired", enrollmentToken({ expiresAt: NOW })],
  ])("refuses an %s enrollment token", async (_label, record) => {
    const { endpoints, tokens, service } = createService();
    tokens.findByHash.mockResolvedValue(record);

    await expect(service.enroll(INSTALL_TOKEN, input)).rejects.toBeInstanceOf(
      InvalidEnrollmentTokenError,
    );
    expect(endpoints.create).not.toHaveBeenCalled();
  });

  it("accepts a token that has not expired yet", async () => {
    const { tokens, service } = createService();
    tokens.findByHash.mockResolvedValue(
      enrollmentToken({ expiresAt: new Date("2026-11-11") }),
    );

    await expect(service.enroll(INSTALL_TOKEN, input)).resolves.toBeDefined();
  });
});

describe("AgentCredentialService.checkCredential", () => {
  it("returns the agent of a valid credential", async () => {
    const { endpoints, service } = createService();
    endpoints.findByCredentialHash.mockResolvedValue(
      endpoint({ clientId: 1, credentialIssuedAt: NOW }),
    );

    await expect(service.checkCredential("ioa_x")).resolves.toEqual({
      status: "valid",
      agent: { endpointId: 10, agentId: AGENT_ID, clientId: 1 },
    });
    expect(endpoints.findByCredentialHash).toHaveBeenCalledWith(
      hashToken("ioa_x"),
    );
  });

  it("reports revoked and unknown credentials", async () => {
    const { endpoints, service } = createService();

    await expect(service.checkCredential("ioa_x")).resolves.toEqual({
      status: "unknown",
    });

    endpoints.findByCredentialHash.mockResolvedValue(
      endpoint({ credentialRevokedAt: NOW }),
    );

    await expect(service.checkCredential("ioa_x")).resolves.toEqual({
      status: "revoked",
    });
  });
});

describe("AgentCredentialService.canUseSharedToken", () => {
  it("allows new agents and legacy endpoints", async () => {
    const { endpoints, service } = createService();

    await expect(service.canUseSharedToken(AGENT_ID)).resolves.toBe(true);

    endpoints.findByAgentId.mockResolvedValue(endpoint());

    await expect(service.canUseSharedToken(AGENT_ID)).resolves.toBe(true);
  });

  it("refuses endpoints with their own credential or revoked", async () => {
    const { endpoints, service } = createService();

    endpoints.findByAgentId.mockResolvedValue(endpoint({ credentialIssuedAt: NOW }));
    await expect(service.canUseSharedToken(AGENT_ID)).resolves.toBe(false);

    endpoints.findByAgentId.mockResolvedValue(endpoint({ credentialRevokedAt: NOW }));
    await expect(service.canUseSharedToken(AGENT_ID)).resolves.toBe(false);
  });
});

describe("AgentCredentialService.revokeEndpoint", () => {
  it("marks the endpoint as revoked", async () => {
    const { endpoints, service } = createService();

    const revoked = await service.revokeEndpoint(10);

    expect(endpoints.update).toHaveBeenCalledWith(10, { credentialRevokedAt: NOW });
    expect(revoked.credentialRevokedAt).toEqual(NOW);
  });

  it("keeps the first revocation date", async () => {
    const { endpoints, service } = createService();
    endpoints.findById.mockResolvedValue(endpoint({ credentialRevokedAt: new Date("2026-11-01") }));

    await service.revokeEndpoint(10);

    expect(endpoints.update).not.toHaveBeenCalled();
  });

  it("fails for an unknown endpoint", async () => {
    const { endpoints, service } = createService();
    endpoints.findById.mockResolvedValue(null);

    await expect(service.revokeEndpoint(99)).rejects.toBeInstanceOf(
      EndpointNotFoundError,
    );
  });
});
