import { describe, expect, it, vi } from "vitest";

import {
  ClientNameTakenError,
  ClientNotFoundError,
  ClientService,
  EnrollmentTokenNotFoundError,
  EnrollmentTokenNotRevealableError,
} from "../../src/services/client.service";
import { hashToken } from "../../src/security/agent-tokens";

const NOW = new Date("2026-11-10T12:00:00.000Z");
const client = { id: 1, name: "Contabilidade Silva", createdAt: NOW };

function tokenRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 5,
    clientId: 1,
    prefix: "ioe_abcdefgh",
    createdAt: NOW,
    expiresAt: null,
    revokedAt: null,
    lastUsedAt: null,
    usageCount: 0,
    ...overrides,
  };
}

function createService() {
  const clients = {
    findAll: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(client),
    findByName: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(client),
  };
  const tokens = {
    create: vi.fn().mockImplementation(async (data) => tokenRecord(data)),
    findByHash: vi.fn(),
    findById: vi.fn().mockResolvedValue(tokenRecord()),
    findByClientId: vi.fn().mockResolvedValue([tokenRecord()]),
    findEncryptedToken: vi.fn().mockResolvedValue("cifrado:ioe_valor"),
    revoke: vi
      .fn()
      .mockImplementation(async (_id, revokedAt) => tokenRecord({ revokedAt })),
    registerUse: vi.fn(),
  };

  return {
    clients,
    tokens,
    service: new ClientService(
      clients,
      tokens,
      () => NOW,
      (token) => `cifrado:${token}`,
      (value) => (value.startsWith("cifrado:") ? value.slice(8) : null),
    ),
  };
}

describe("ClientService", () => {
  it("lists clients with the current time for the active token count", async () => {
    const { clients, service } = createService();

    await service.findAll();

    expect(clients.findAll).toHaveBeenCalledWith(NOW);
  });

  it("creates a client", async () => {
    const { clients, service } = createService();

    await expect(service.create("Contabilidade Silva")).resolves.toEqual(client);
    expect(clients.create).toHaveBeenCalledWith("Contabilidade Silva");
  });

  it("refuses a name already in use", async () => {
    const { clients, service } = createService();
    clients.findByName.mockResolvedValue(client);

    await expect(service.create("contabilidade silva")).rejects.toBeInstanceOf(
      ClientNameTakenError,
    );
    expect(clients.create).not.toHaveBeenCalled();
  });

  it("turns a unique violation from the database into a name conflict", async () => {
    const { clients, service } = createService();
    clients.create.mockRejectedValue({ code: "P2002" });

    await expect(service.create("Outro")).rejects.toBeInstanceOf(
      ClientNameTakenError,
    );
  });

  it("generates an enrollment token and stores the hash and the encrypted value", async () => {
    const { tokens, service } = createService();

    const { token, enrollmentToken } = await service.createEnrollmentToken(1);

    expect(token).toMatch(/^ioe_[A-Za-z0-9_-]{43}$/);
    expect(tokens.create).toHaveBeenCalledWith({
      clientId: 1,
      tokenHash: hashToken(token),
      prefix: token.slice(0, 12),
      encryptedToken: `cifrado:${token}`,
      expiresAt: undefined,
    });
    expect(enrollmentToken).not.toHaveProperty("tokenHash", token);
  });

  it("sets the expiration from expiresInDays", async () => {
    const { tokens, service } = createService();

    await service.createEnrollmentToken(1, { expiresInDays: 7 });

    expect(tokens.create.mock.calls[0][0].expiresAt).toEqual(
      new Date("2026-11-17T12:00:00.000Z"),
    );
  });

  it("generates a different token each time", async () => {
    const { service } = createService();

    const first = await service.createEnrollmentToken(1);
    const second = await service.createEnrollmentToken(1);

    expect(first.token).not.toBe(second.token);
  });

  it("fails when the client does not exist", async () => {
    const { clients, service } = createService();
    clients.findById.mockResolvedValue(null);

    await expect(service.createEnrollmentToken(99)).rejects.toBeInstanceOf(
      ClientNotFoundError,
    );
    await expect(service.findEnrollmentTokens(99)).rejects.toBeInstanceOf(
      ClientNotFoundError,
    );
  });

  it("revokes an enrollment token of the client", async () => {
    const { tokens, service } = createService();

    const revoked = await service.revokeEnrollmentToken(1, 5);

    expect(tokens.revoke).toHaveBeenCalledWith(5, NOW);
    expect(revoked.revokedAt).toEqual(NOW);
  });

  it("keeps the first revocation date when revoking twice", async () => {
    const { tokens, service } = createService();
    const earlier = new Date("2026-11-01T00:00:00.000Z");
    tokens.findById.mockResolvedValue(tokenRecord({ revokedAt: earlier }));

    const revoked = await service.revokeEnrollmentToken(1, 5);

    expect(revoked.revokedAt).toEqual(earlier);
    expect(tokens.revoke).not.toHaveBeenCalled();
  });

  it("does not revoke a token of another client", async () => {
    const { tokens, service } = createService();
    tokens.findById.mockResolvedValue(tokenRecord({ clientId: 2 }));

    await expect(service.revokeEnrollmentToken(1, 5)).rejects.toBeInstanceOf(
      EnrollmentTokenNotFoundError,
    );
  });

  it("shows an active token again", async () => {
    const { tokens, service } = createService();

    await expect(service.revealEnrollmentToken(1, 5)).resolves.toBe("ioe_valor");
    expect(tokens.findEncryptedToken).toHaveBeenCalledWith(5);
  });

  it.each([
    ["revoked", { revokedAt: new Date("2026-11-09") }],
    ["expired", { expiresAt: NOW }],
  ])("does not show a %s token again", async (_label, overrides) => {
    const { tokens, service } = createService();
    tokens.findById.mockResolvedValue(tokenRecord(overrides));

    await expect(service.revealEnrollmentToken(1, 5)).rejects.toBeInstanceOf(
      EnrollmentTokenNotRevealableError,
    );
    expect(tokens.findEncryptedToken).not.toHaveBeenCalled();
  });

  it("does not show tokens created before the encryption or with another secret", async () => {
    const { tokens, service } = createService();

    tokens.findEncryptedToken.mockResolvedValue(null);
    await expect(service.revealEnrollmentToken(1, 5)).rejects.toBeInstanceOf(
      EnrollmentTokenNotRevealableError,
    );

    tokens.findEncryptedToken.mockResolvedValue("outro-segredo");
    await expect(service.revealEnrollmentToken(1, 5)).rejects.toBeInstanceOf(
      EnrollmentTokenNotRevealableError,
    );
  });

  it("does not show a token of another client", async () => {
    const { tokens, service } = createService();
    tokens.findById.mockResolvedValue(tokenRecord({ clientId: 2 }));

    await expect(service.revealEnrollmentToken(1, 5)).rejects.toBeInstanceOf(
      EnrollmentTokenNotFoundError,
    );
  });
});
