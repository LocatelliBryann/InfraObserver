import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import app from "../../src/app";
import { authService } from "../../src/config/dependencies";
import { prisma } from "../../src/database/prisma";

const ADMIN = {
  email: "admin.routes@infraobserver.local",
  name: "Admin Rotas",
  password: "senha-das-rotas-123",
};

function sessionCookieFrom(response: request.Response): string {
  const header = response.headers["set-cookie"] as unknown as string[];

  return header[0].split(";")[0];
}

describe("auth routes", () => {
  beforeAll(async () => {
    await authService.upsertAdmin(ADMIN);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: ADMIN.email } });
    await prisma.$disconnect();
  });

  it("should block the dashboard data without a session", async () => {
    const responses = await Promise.all(
      [
        "/api/v1/endpoints",
        "/api/v1/endpoints/health",
        "/api/v1/metrics?endpointId=1",
        "/api/v1/file-events",
        "/api/v1/alerts",
        "/api/v1/auth/me",
      ].map((path) => request(app).get(path)),
    );

    expect(responses.map((response) => response.status)).toEqual([
      401, 401, 401, 401, 401, 401,
    ]);
  });

  it("should keep /health public", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
  });

  it("should log in, access protected data and log out", async () => {
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: ADMIN.email.toUpperCase(), password: ADMIN.password });

    expect(login.status).toBe(200);
    expect(login.body.user).toMatchObject({ email: ADMIN.email, role: "ADMIN" });
    expect(login.headers["set-cookie"][0]).toContain("HttpOnly");
    expect(login.headers["set-cookie"][0]).toContain("SameSite=Strict");

    const cookie = sessionCookieFrom(login);

    const me = await request(app).get("/api/v1/auth/me").set("Cookie", cookie);
    expect(me.status).toBe(200);
    expect(me.body.user.name).toBe(ADMIN.name);

    const alerts = await request(app).get("/api/v1/alerts").set("Cookie", cookie);
    expect(alerts.status).toBe(200);

    const logout = await request(app)
      .post("/api/v1/auth/logout")
      .set("Cookie", cookie);
    expect(logout.status).toBe(204);
    expect(logout.headers["set-cookie"][0]).toContain("infraobserver_session=;");
  });

  it("should reject a wrong password", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: ADMIN.email, password: "senha-errada-000" });

    expect(response.status).toBe(401);
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("should reject a login coming from another site", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", "https://site-malicioso.example")
      .send({ email: ADMIN.email, password: ADMIN.password });

    expect(response.status).toBe(403);
  });
});
