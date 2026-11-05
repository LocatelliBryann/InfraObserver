import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "../../src/database/prisma";
import { PrismaMetricRepository } from "../../src/repositories/metric.repository";

describe("MetricRepository integration", () => {
  const repository = new PrismaMetricRepository();

  const agentId = randomUUID();
  let endpointId: number;

  beforeAll(async () => {
    const endpoint = await prisma.endpoint.create({
      data: {
        agentId,
        hostname: "PC-METRICS-INTEGRATION",
        ipAddress: "192.168.1.200",
        osName: "Windows",
        osVersion: "11",
        status: "ONLINE",
        lastSeenAt: new Date(),
      },
    });

    endpointId = endpoint.id;
  });

  afterAll(async () => {
    await prisma.metric.deleteMany({
      where: {
        endpointId,
      },
    });

    await prisma.endpoint.delete({
      where: {
        id: endpointId,
      },
    });

    await prisma.$disconnect();
  });

  it("should find an endpoint by agentId", async () => {
    const endpoint = await repository.findEndpointByAgentId(agentId);

    expect(endpoint).not.toBeNull();
    expect(endpoint?.id).toBe(endpointId);
    expect(endpoint?.agentId).toBe(agentId);
  });

  it("should create a metric using PostgreSQL", async () => {
    const collectedAt = new Date();

    const metric = await repository.create({
      endpointId,
      cpuPercent: 35.5,
      memoryUsed: 4096,
      memoryTotal: 8192,
      diskUsed: 50000,
      diskTotal: 100000,
      netBytesSent: BigInt(1000),
      netBytesRecv: BigInt(2000),
      collectedAt,
    });

    expect(metric.id).toBeTypeOf("number");
    expect(metric.endpointId).toBe(endpointId);
    expect(metric.cpuPercent).toBe(35.5);
    expect(metric.memoryUsed).toBe(4096);
    expect(metric.memoryTotal).toBe(8192);
    expect(metric.netBytesSent).toBe(BigInt(1000));
    expect(metric.netBytesRecv).toBe(BigInt(2000));
    expect(metric.collectedAt).toEqual(collectedAt);
  });
});