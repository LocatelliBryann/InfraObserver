import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import app from "../../src/app";
import { prisma } from "../../src/database/prisma";

describe("POST /api/v1/metrics", () => {
  const agentId = "550e8400-e29b-41d4-a716-446655440002";

  beforeEach(async () => {
    await prisma.metric.deleteMany({
      where: {
        endpoint: {
          agentId,
        },
      },
    });

    await prisma.endpoint.deleteMany({
      where: {
        agentId,
      },
    });
  });

  afterAll(async () => {
    await prisma.metric.deleteMany({
      where: {
        endpoint: {
          agentId,
        },
      },
    });

    await prisma.endpoint.deleteMany({
      where: {
        agentId,
      },
    });

    await prisma.$disconnect();
  });

  it("should create a metric for a registered endpoint", async () => {
    await prisma.endpoint.create({
      data: {
        agentId,
        hostname: "PC-METRICS-001",
        ipAddress: "192.168.1.30",
        osName: "Windows",
        osVersion: "11",
        status: "ONLINE",
        lastSeenAt: new Date(),
      },
    });

    const response = await request(app)
      .post("/api/v1/metrics")
      .send({
        agentId,
        cpuPercent: 35.5,
        memoryUsed: 4096,
        memoryTotal: 8192,
        diskUsed: 50000,
        diskTotal: 100000,
        netBytesSent: 1000,
        netBytesRecv: 2000,
        collectedAt: "2026-09-08T21:30:00.000Z",
      });

    expect(response.status).toBe(201);
    expect(response.body.cpuPercent).toBe(35.5);
    expect(response.body.memoryUsed).toBe(4096);
    expect(response.body.netBytesSent).toBe("1000");
    expect(response.body.netBytesRecv).toBe("2000");
  });

  it("should return 404 when the endpoint is not registered", async () => {
    const response = await request(app)
      .post("/api/v1/metrics")
      .send({
        agentId: "550e8400-e29b-41d4-a716-446655440003",
        cpuPercent: 25,
        memoryUsed: 2048,
        memoryTotal: 8192,
        collectedAt: "2026-09-08T21:30:00.000Z",
      });

    expect(response.status).toBe(404);
  });
  it("should return 400 when cpuPercent is invalid", async () => {
  await prisma.endpoint.create({
    data: {
      agentId: "550e8400-e29b-41d4-a716-446655440002",
      hostname: "PC-METRICS-INVALID-CPU",
      ipAddress: "192.168.1.31",
      osName: "Windows",
      osVersion: "11",
      status: "ONLINE",
      lastSeenAt: new Date(),
    },
  });

  const response = await request(app)
    .post("/api/v1/metrics")
    .send({
      agentId: "550e8400-e29b-41d4-a716-446655440002",
      cpuPercent: 150,
      memoryUsed: 4096,
      memoryTotal: 8192,
      diskUsed: 50000,
      diskTotal: 100000,
      netBytesSent: 1000,
      netBytesRecv: 2000,
      collectedAt: "2026-09-08T21:30:00.000Z",
    });

  expect(response.status).toBe(400);
});
it("should return 400 when collectedAt is invalid", async () => {
  const response = await request(app)
    .post("/api/v1/metrics")
    .send({
      agentId: "550e8400-e29b-41d4-a716-446655440002",
      cpuPercent: 35.5,
      memoryUsed: 4096,
      memoryTotal: 8192,
      collectedAt: "invalid-date",
    });

  expect(response.status).toBe(400);
});
it("should return 400 when agentId is invalid", async () => {
  const response = await request(app)
    .post("/api/v1/metrics")
    .send({
      agentId: "invalid-agent-id",
      cpuPercent: 35.5,
      memoryUsed: 4096,
      memoryTotal: 8192,
      collectedAt: "2026-09-08T21:30:00.000Z",
    });

  expect(response.status).toBe(400);
});
});