import request from "supertest";
import { describe, expect, it, vi } from "vitest";

// Antes de carregar o app: nada de chamar o GitHub nos testes.
vi.hoisted(() => {
  process.env.AGENT_UPDATES_ENABLED = "false";
  process.env.AGENT_TOKENS = "test-agent-token";
});

import app from "../../src/app";

describe("GET /api/v1/agent/update", () => {
  it("requires the agent token", async () => {
    const response = await request(app).get("/api/v1/agent/update");

    expect(response.status).toBe(401);
  });

  it("answers 204 when updates are disabled", async () => {
    const response = await request(app)
      .get("/api/v1/agent/update")
      .set("Authorization", "Bearer test-agent-token");

    expect(response.status).toBe(204);
  });
});
