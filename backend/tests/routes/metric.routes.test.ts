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

  it("should create an alert when CPU exceeds the threshold", async () => {
    const endpoint = await prisma.endpoint.create({
      data: {
        agentId,
        hostname: "PC-METRICS-ALERT",
        ipAddress: "192.168.1.32",
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
        cpuPercent: 95,
        memoryUsed: 4096,
        memoryTotal: 8192,
        diskUsed: 50000,
        diskTotal: 100000,
        netBytesSent: 1000,
        netBytesRecv: 2000,
        collectedAt: "2026-09-15T22:10:00.000Z",
      });

    expect(response.status).toBe(201);

    const alert = await prisma.alert.findFirst({
      where: {
        endpointId: endpoint.id,
        metricType: "CPU",
        resolvedAt: null,
      },
    });

    expect(alert).not.toBeNull();
    expect(alert?.metricType).toBe("CPU");
    expect(alert?.thresholdValue).toBe(80);
    expect(alert?.severity).toBe("HIGH");
    expect(alert?.metricId).toBe(response.body.id);
  });

  it("should not create an alert when CPU is within the threshold", async () => {
    const endpoint = await prisma.endpoint.create({
      data: {
        agentId,
        hostname: "PC-METRICS-NORMAL",
        ipAddress: "192.168.1.33",
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
        cpuPercent: 70,
        memoryUsed: 4096,
        memoryTotal: 8192,
        diskUsed: 50000,
        diskTotal: 100000,
        netBytesSent: 1000,
        netBytesRecv: 2000,
        collectedAt: "2026-09-15T22:10:00.000Z",
      });

    expect(response.status).toBe(201);

    const alert = await prisma.alert.findFirst({
      where: {
        endpointId: endpoint.id,
        metricType: "CPU",
      },
    });

    expect(alert).toBeNull();
  });

  it("should resolve an active CPU alert after two consecutive normal collections", async () => {
    const endpoint = await prisma.endpoint.create({
      data: {
        agentId,
        hostname: "PC-METRICS-RESOLVE",
        ipAddress: "192.168.1.34",
        osName: "Windows",
        osVersion: "11",
        status: "ONLINE",
        lastSeenAt: new Date(),
      },
    });

    const alertResponse = await request(app)
      .post("/api/v1/metrics")
      .send({
        agentId,
        cpuPercent: 95,
        memoryUsed: 4096,
        memoryTotal: 8192,
        diskUsed: 50000,
        diskTotal: 100000,
        netBytesSent: 1000,
        netBytesRecv: 2000,
        collectedAt: "2026-09-15T22:10:00.000Z",
      });

    expect(alertResponse.status).toBe(201);

    const firstNormalResponse = await request(app)
      .post("/api/v1/metrics")
      .send({
        agentId,
        cpuPercent: 70,
        memoryUsed: 4096,
        memoryTotal: 8192,
        diskUsed: 50000,
        diskTotal: 100000,
        netBytesSent: 1000,
        netBytesRecv: 2000,
        collectedAt: "2026-09-15T22:11:00.000Z",
      });

    expect(firstNormalResponse.status).toBe(201);

    const activeAlert = await prisma.alert.findFirst({
      where: {
        endpointId: endpoint.id,
        metricType: "CPU",
        resolvedAt: null,
      },
    });

    expect(activeAlert).not.toBeNull();

    const secondNormalResponse = await request(app)
      .post("/api/v1/metrics")
      .send({
        agentId,
        cpuPercent: 65,
        memoryUsed: 4096,
        memoryTotal: 8192,
        diskUsed: 50000,
        diskTotal: 100000,
        netBytesSent: 1000,
        netBytesRecv: 2000,
        collectedAt: "2026-09-15T22:12:00.000Z",
      });

    expect(secondNormalResponse.status).toBe(201);

    const resolvedAlert = await prisma.alert.findUnique({
      where: {
        id: activeAlert!.id,
      },
    });

    expect(resolvedAlert).not.toBeNull();
    expect(resolvedAlert?.resolvedAt).not.toBeNull();
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
        agentId,
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
        agentId,
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
        agentId,
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