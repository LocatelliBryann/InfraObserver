import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import app from "../../src/app";
import { prisma } from "../../src/database/prisma";

const AGENT_TOKEN = "test-agent-token";
const AGENT_AUTH_HEADER = `Bearer ${AGENT_TOKEN}`;

process.env.AGENT_TOKENS = AGENT_TOKEN;

describe("POST /api/v1/endpoints/register", () => {
  const agentId = "550e8400-e29b-41d4-a716-446655440001";

  beforeEach(async () => {
    await prisma.endpoint.deleteMany({
      where: {
        agentId,
      },
    });
  });

  afterAll(async () => {
    await prisma.endpoint.deleteMany({
      where: {
        agentId,
      },
    });

    await prisma.$disconnect();
  });

  it("should register an endpoint", async () => {
    const response = await request(app)
      .post("/api/v1/endpoints/register")
      .set("Authorization", AGENT_AUTH_HEADER)
      .send({
        agentId,
        hostname: "PC-001",
        ipAddress: "192.168.1.10",
        osName: "Windows",
        osVersion: "11",
      });

    expect(response.status).toBe(200);
    expect(response.body.agentId).toBe(agentId);
    expect(response.body.hostname).toBe("PC-001");
    expect(response.body.status).toBe("ONLINE");
  });

  it("should store the agent version and update it on the next registration", async () => {
    const register = (agentVersion: string) =>
      request(app)
        .post("/api/v1/endpoints/register")
        .set("Authorization", AGENT_AUTH_HEADER)
        .send({ agentId, hostname: "PC-001", ipAddress: "192.168.1.10", agentVersion });

    expect((await register("0.0.0-dev.3")).body.agentVersion).toBe("0.0.0-dev.3");

    const updated = await register("1.5.0");

    expect(updated.status).toBe(200);
    expect(updated.body.agentVersion).toBe("1.5.0");
  });

  it("should return 400 when the agent version is invalid", async () => {
    const response = await request(app)
      .post("/api/v1/endpoints/register")
      .set("Authorization", AGENT_AUTH_HEADER)
      .send({ agentId, hostname: "PC-001", ipAddress: "192.168.1.10", agentVersion: "latest; rm -rf" });

    expect(response.status).toBe(400);
  });

  it("should return 400 when the payload is invalid", async () => {
    const response = await request(app)
      .post("/api/v1/endpoints/register")
      .set("Authorization", AGENT_AUTH_HEADER)
      .send({
        agentId,
        hostname: "",
        ipAddress: "192.168.1.10",
        osName: "Windows",
        osVersion: "11",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid request payload");
  });

  it("should return 400 when agentId is not a valid UUID", async () => {
    const response = await request(app)
      .post("/api/v1/endpoints/register")
      .set("Authorization", AGENT_AUTH_HEADER)
      .send({
        agentId: "invalid-agent-id",
        hostname: "PC-002",
        ipAddress: "192.168.1.11",
        osName: "Windows",
        osVersion: "11",
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Invalid request payload");
  });

  it("should update an existing endpoint", async () => {
    await request(app)
      .post("/api/v1/endpoints/register")
      .set("Authorization", AGENT_AUTH_HEADER)
      .send({
        agentId,
        hostname: "PC-003",
        ipAddress: "192.168.1.20",
        osName: "Windows",
        osVersion: "10",
      })
      .expect(200);

    const response = await request(app)
      .post("/api/v1/endpoints/register")
      .set("Authorization", AGENT_AUTH_HEADER)
      .send({
        agentId,
        hostname: "PC-003-UPDATED",
        ipAddress: "192.168.1.21",
        osName: "Windows",
        osVersion: "11",
      });

    expect(response.status).toBe(200);
    expect(response.body.agentId).toBe(agentId);
    expect(response.body.hostname).toBe("PC-003-UPDATED");
    expect(response.body.ipAddress).toBe("192.168.1.21");
    expect(response.body.osVersion).toBe("11");
    expect(response.body.status).toBe("ONLINE");
  });

  it("should return 401 when the agent token is missing", async () => {
    const response = await request(app)
      .post("/api/v1/endpoints/register")
      .send({});

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Missing agent token");
  });

  it("should return 401 when the agent token is invalid", async () => {
    const response = await request(app)
      .post("/api/v1/endpoints/register")
      .set("Authorization", "Bearer wrong-token")
      .send({});

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Invalid agent token");
  });
});
