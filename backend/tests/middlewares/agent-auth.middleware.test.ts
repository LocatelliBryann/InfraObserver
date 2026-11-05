import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { authenticateAgent } from "../../src/middlewares/agent-auth.middleware";

function createTestApp() {
  const app = express();

  app.post("/protected", authenticateAgent, (_req, res) => {
    res.status(200).json({ ok: true });
  });

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

  it("should allow requests with a valid bearer token", async () => {
    const response = await request(createTestApp())
      .post("/protected")
      .set("Authorization", "Bearer token-pc-001");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it("should accept any of the configured tokens", async () => {
    const response = await request(createTestApp())
      .post("/protected")
      .set("Authorization", "Bearer token-pc-002");

    expect(response.status).toBe(200);
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

  it("should return 401 when the token is invalid", async () => {
    const response = await request(createTestApp())
      .post("/protected")
      .set("Authorization", "Bearer wrong-token");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid agent token");
  });

  it("should return 500 when no agent token is configured", async () => {
    process.env.AGENT_TOKENS = "";

    const response = await request(createTestApp())
      .post("/protected")
      .set("Authorization", "Bearer token-pc-001");

    expect(response.status).toBe(500);
    expect(response.body.message).toBe(
      "Agent authentication is not configured",
    );
  });
});
