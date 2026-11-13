import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createEnrollmentRateLimit } from "../../src/middlewares/enrollment-rate-limit.middleware";

function createApp(limit = 3, windowMs = 60_000, clock = { time: 0 }) {
  const app = express();
  const rateLimit = createEnrollmentRateLimit(limit, windowMs, () => clock.time);

  app.post("/enroll/:result", rateLimit, (req, res) => {
    const delay = req.query.delay ? Number(req.query.delay) : 0;

    setTimeout(() => {
      res.sendStatus(req.params.result === "ok" ? 200 : 401);
    }, delay);
  });

  return { app, clock };
}

describe("createEnrollmentRateLimit", () => {
  it("should block an address after too many failed attempts", async () => {
    const { app } = createApp(3);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await request(app).post("/enroll/fail").expect(401);
    }

    const blocked = await request(app).post("/enroll/ok").expect(429);
    expect(blocked.body).toEqual({
      message: "Too many enrollment attempts. Try again later.",
    });
    expect(blocked.headers["retry-after"]).toBe("60");
  });

  it("should not count successful enrollments", async () => {
    const { app } = createApp(3);

    for (let attempt = 0; attempt < 10; attempt += 1) {
      await request(app).post("/enroll/ok").expect(200);
    }

    await request(app).post("/enroll/fail").expect(401);
  });

  it("should accept many simultaneous enrollments from the same address", async () => {
    // Antes, cada requisição em andamento contava contra o limite.
    const { app } = createApp(3);

    const responses = await Promise.all(
      Array.from({ length: 20 }, () =>
        request(app).post("/enroll/ok?delay=20"),
      ),
    );

    expect(responses.map((response) => response.status)).toEqual(
      Array(20).fill(200),
    );
  });

  it("should allow attempts again when the window ends", async () => {
    const { app, clock } = createApp(2, 60_000);

    await request(app).post("/enroll/fail").expect(401);
    await request(app).post("/enroll/fail").expect(401);
    await request(app).post("/enroll/ok").expect(429);

    clock.time = 60_000;

    await request(app).post("/enroll/ok").expect(200);
  });
});
