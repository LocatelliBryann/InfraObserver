import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Logger } from "../../src/config/logger";
import { createAuthenticateAgent } from "../../src/middlewares/agent-auth.middleware";
import type { CredentialCheck } from "../../src/services/agent-credential.service";

const AGENT_ID = "550e8400-e29b-41d4-a716-446655440010";
const OTHER_AGENT_ID = "550e8400-e29b-41d4-a716-446655440011";
const CREDENTIAL = "ioa_credencial-do-pc";

function createLog() {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as Logger;
}

function createCredentials(overrides: {
  check?: CredentialCheck;
  canUseSharedToken?: boolean;
} = {}) {
  return {
    checkCredential: vi.fn().mockResolvedValue(
      overrides.check ?? {
        status: "valid",
        agent: { endpointId: 7, agentId: AGENT_ID, clientId: 3 },
      },
    ),
    canUseSharedToken: vi
      .fn()
      .mockResolvedValue(overrides.canUseSharedToken ?? true),
  };
}

function createTestApp(credentials = createCredentials()) {
  const app = express();

  app.use(express.json());
  app.post(
    "/protected",
    createAuthenticateAgent(credentials, createLog()),
    (_req, res) => {
      res.status(200).json({ ok: true, agent: res.locals.agent ?? null });
    },
  );

  return app;
}

describe("authenticateAgent middleware", () => {
  const originalTokens = process.env.AGENT_TOKENS;

  beforeEach(() => {
    process.env.AGENT_TOKENS = "token-pc-001, token-pc-002";
  });

  afterEach(() => {
    process.env.AGENT_TOKENS = originalTokens;
  });

  describe("shared tokens (AGENT_TOKENS)", () => {
    it("should allow requests with a valid bearer token", async () => {
      const response = await request(createTestApp())
        .post("/protected")
        .set("Authorization", "Bearer token-pc-001");

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ ok: true, agent: null });
    });

    it("should accept any of the configured tokens", async () => {
      const response = await request(createTestApp())
        .post("/protected")
        .set("Authorization", "Bearer token-pc-002");

      expect(response.status).toBe(200);
    });

    it("should return 401 when the token is invalid", async () => {
      const response = await request(createTestApp())
        .post("/protected")
        .set("Authorization", "Bearer wrong-token");

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid agent token");
    });

    it("should reject every shared token when the list is empty", async () => {
      process.env.AGENT_TOKENS = "";

      const response = await request(createTestApp())
        .post("/protected")
        .set("Authorization", "Bearer token-pc-001");

      expect(response.status).toBe(401);
    });

    it("should refuse the shared token for an agent with its own credential or revoked", async () => {
      const credentials = createCredentials({ canUseSharedToken: false });

      const response = await request(createTestApp(credentials))
        .post("/protected")
        .set("Authorization", "Bearer token-pc-001")
        .send({ agentId: AGENT_ID });

      expect(response.status).toBe(403);
      expect(credentials.canUseSharedToken).toHaveBeenCalledWith(AGENT_ID);
    });

    it("should not look up the agent when the body has no valid agentId", async () => {
      const credentials = createCredentials();

      const response = await request(createTestApp(credentials))
        .post("/protected")
        .set("Authorization", "Bearer token-pc-001")
        .send({ agentId: "not-a-uuid" });

      expect(response.status).toBe(200);
      expect(credentials.canUseSharedToken).not.toHaveBeenCalled();
    });
  });

  describe("agent credentials (ioa_)", () => {
    it("should accept the credential and expose the agent", async () => {
      const credentials = createCredentials();

      const response = await request(createTestApp(credentials))
        .post("/protected")
        .set("Authorization", `Bearer ${CREDENTIAL}`)
        .send({ agentId: AGENT_ID });

      expect(response.status).toBe(200);
      expect(response.body.agent).toEqual({
        endpointId: 7,
        agentId: AGENT_ID,
        clientId: 3,
      });
      expect(credentials.checkCredential).toHaveBeenCalledWith(CREDENTIAL);
    });

    it("should accept the credential on requests without body", async () => {
      const response = await request(createTestApp())
        .post("/protected")
        .set("Authorization", `Bearer ${CREDENTIAL}`);

      expect(response.status).toBe(200);
    });

    it("should return 403 when the credential is used for another agentId", async () => {
      const response = await request(createTestApp())
        .post("/protected")
        .set("Authorization", `Bearer ${CREDENTIAL}`)
        .send({ agentId: OTHER_AGENT_ID });

      expect(response.status).toBe(403);
    });

    it("should return 401 when the credential was revoked", async () => {
      const credentials = createCredentials({ check: { status: "revoked" } });

      const response = await request(createTestApp(credentials))
        .post("/protected")
        .set("Authorization", `Bearer ${CREDENTIAL}`);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Agent access revoked");
    });

    it("should return 401 when the credential is unknown", async () => {
      const credentials = createCredentials({ check: { status: "unknown" } });

      const response = await request(createTestApp(credentials))
        .post("/protected")
        .set("Authorization", `Bearer ${CREDENTIAL}`);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid agent token");
    });

    it("should not compare credentials with the shared list", async () => {
      process.env.AGENT_TOKENS = CREDENTIAL;
      const credentials = createCredentials({ check: { status: "unknown" } });

      const response = await request(createTestApp(credentials))
        .post("/protected")
        .set("Authorization", `Bearer ${CREDENTIAL}`);

      expect(response.status).toBe(401);
    });
  });

  it("should return 401 when the authorization header is missing", async () => {
    const response = await request(createTestApp()).post("/protected");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Missing agent token");
  });

  it("should return 401 when the scheme is not Bearer", async () => {
    const response = await request(createTestApp())
      .post("/protected")
      .set("Authorization", "Basic token-pc-001");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Missing agent token");
  });

  it("should return 500 when the credential lookup fails", async () => {
    const credentials = createCredentials();
    credentials.checkCredential.mockRejectedValue(new Error("db down"));

    const response = await request(createTestApp(credentials))
      .post("/protected")
      .set("Authorization", `Bearer ${CREDENTIAL}`);

    expect(response.status).toBe(500);
  });

  describe("agentId na URL (configuração do agente)", () => {
    function createUrlApp(credentials = createCredentials()) {
      const app = express();

      app.use(express.json());
      app.post(
        "/agents/:agentId/config",
        createAuthenticateAgent(credentials, createLog()),
        (_req, res) => {
          res.status(200).json({ ok: true });
        },
      );

      return app;
    }

    it("should accept the credential for its own agentId", async () => {
      const response = await request(createUrlApp())
        .post(`/agents/${AGENT_ID}/config`)
        .set("Authorization", `Bearer ${CREDENTIAL}`);

      expect(response.status).toBe(200);
    });

    it("should use the agentId from the URL, not from the body", async () => {
      const response = await request(createUrlApp())
        .post(`/agents/${OTHER_AGENT_ID}/config`)
        .set("Authorization", `Bearer ${CREDENTIAL}`)
        .send({ agentId: AGENT_ID });

      expect(response.status).toBe(403);
    });
  });
});
