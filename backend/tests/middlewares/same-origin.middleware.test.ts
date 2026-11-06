import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { requireSameOrigin } from "../../src/middlewares/same-origin.middleware";

function createApp() {
  const app = express();

  app.post("/login", requireSameOrigin, (_req, res) => {
    res.status(200).json({ ok: true });
  });

  return app;
}

describe("requireSameOrigin middleware", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should allow requests without an Origin header", async () => {
    const response = await request(createApp()).post("/login");

    expect(response.status).toBe(200);
  });

  it("should allow requests from the same host", async () => {
    const response = await request(createApp())
      .post("/login")
      .set("Host", "infraobserver.com.br")
      .set("Origin", "https://infraobserver.com.br");

    expect(response.status).toBe(200);
  });

  it("should allow configured origins", async () => {
    vi.stubEnv("CORS_ORIGINS", "http://localhost:5173");

    const response = await request(createApp())
      .post("/login")
      .set("Origin", "http://localhost:5173");

    expect(response.status).toBe(200);
  });

  it("should block other sites", async () => {
    const response = await request(createApp())
      .post("/login")
      .set("Host", "infraobserver.com.br")
      .set("Origin", "https://site-malicioso.example");

    expect(response.status).toBe(403);
  });

  it("should block a malformed Origin", async () => {
    const response = await request(createApp())
      .post("/login")
      .set("Origin", "não é uma url");

    expect(response.status).toBe(403);
  });
});
