import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createLoginRateLimit } from "../../src/middlewares/login-rate-limit.middleware";

function createApp() {
  const app = express();

  app.use(express.json());
  app.post("/login", createLoginRateLimit(2), (req, res) => {
    const ok = req.body.password === "certa";
    res.status(ok ? 200 : 401).json({ ok });
  });

  return app;
}

describe("login rate limit", () => {
  it("should block after too many failed attempts", async () => {
    const app = createApp();

    await request(app).post("/login").send({ password: "errada" });
    await request(app).post("/login").send({ password: "errada" });
    const blocked = await request(app).post("/login").send({ password: "certa" });

    expect(blocked.status).toBe(429);
    expect(blocked.body.message).toContain("Too many login attempts");
  });

  it("should not count successful logins", async () => {
    const app = createApp();

    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await request(app).post("/login").send({ password: "certa" });
      expect(response.status).toBe(200);
    }
  });
});
