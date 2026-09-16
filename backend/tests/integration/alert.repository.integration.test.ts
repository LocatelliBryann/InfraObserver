import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/database/prisma";
import { PrismaAlertRepository } from "../../src/repositories/alert.repository";

describe("PrismaAlertRepository", () => {
  const repository = new PrismaAlertRepository();

  let endpointId: number;

  beforeAll(async () => {
    const endpoint = await prisma.endpoint.create({
      data: {
        agentId: crypto.randomUUID(),
        hostname: "integration-test",
        ipAddress: "127.0.0.1",
        osName: "Windows",
        osVersion: "11",
        status: "ONLINE",
      },
    });

    endpointId = endpoint.id;
  });

  afterAll(async () => {
    await prisma.alert.deleteMany({
      where: {
        endpointId,
      },
    });

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

  it("should return null when there is no active alert", async () => {
    const result = await repository.findActiveByEndpointAndMetricType(
      endpointId,
      "CPU",
    );

    expect(result).toBeNull();
  });

  it("should create an alert in PostgreSQL", async () => {
    const metric = await prisma.metric.create({
      data: {
        endpointId,
        cpuPercent: 95,
        collectedAt: new Date(),
      },
    });

    const alert = await repository.create({
      endpointId,
      metricId: metric.id,
      metricType: "CPU",
      thresholdValue: 80,
      severity: "HIGH",
      triggeredAt: new Date(),
    });

    expect(alert.id).toBeDefined();
    expect(alert.endpointId).toBe(endpointId);
    expect(alert.metricType).toBe("CPU");
    expect(alert.resolvedAt).toBeNull();
  });

  it("should find an active alert", async () => {
    const result = await repository.findActiveByEndpointAndMetricType(
      endpointId,
      "CPU",
    );

    expect(result).not.toBeNull();
    expect(result?.metricType).toBe("CPU");
    expect(result?.resolvedAt).toBeNull();
  });

  it("should count two consecutive normal CPU collections", async () => {
    await prisma.alert.deleteMany({
      where: {
        endpointId,
      },
    });

    await prisma.metric.deleteMany({
      where: {
        endpointId,
      },
    });

    await prisma.metric.createMany({
      data: [
        {
          endpointId,
          cpuPercent: 70,
          collectedAt: new Date("2026-09-15T22:00:00.000Z"),
        },
        {
          endpointId,
          cpuPercent: 65,
          collectedAt: new Date("2026-09-15T22:01:00.000Z"),
        },
      ],
    });

    const result = await repository.countConsecutiveNormalCollections(
      endpointId,
      "CPU",
      80,
    );

    expect(result).toBe(2);
  });
  it("should stop counting when a metric exceeds the threshold", async () => {
  await prisma.metric.deleteMany({
    where: {
      endpointId,
    },
  });

  await prisma.metric.createMany({
    data: [
      {
        endpointId,
        cpuPercent: 70,
        collectedAt: new Date("2026-09-15T22:00:00.000Z"),
      },
      {
        endpointId,
        cpuPercent: 95,
        collectedAt: new Date("2026-09-15T22:01:00.000Z"),
      },
      {
        endpointId,
        cpuPercent: 65,
        collectedAt: new Date("2026-09-15T22:02:00.000Z"),
      },
    ],
  });

  const result = await repository.countConsecutiveNormalCollections(
    endpointId,
    "CPU",
    80,
  );

  expect(result).toBe(1);
  });
  it("should resolve an active alert in PostgreSQL", async () => {
  await prisma.alert.deleteMany({
    where: {
      endpointId,
    },
  });

  const metric = await prisma.metric.create({
    data: {
      endpointId,
      cpuPercent: 95,
      collectedAt: new Date(),
    },
  });

  const alert = await repository.create({
    endpointId,
    metricId: metric.id,
    metricType: "CPU",
    thresholdValue: 80,
    severity: "HIGH",
    triggeredAt: new Date(),
  });

  const resolvedAt = new Date();

  const resolvedAlert = await repository.resolve(
    alert.id,
    resolvedAt,
  );

  expect(resolvedAlert.id).toBe(alert.id);
  expect(resolvedAlert.resolvedAt).not.toBeNull();

  const persistedAlert = await prisma.alert.findUnique({
    where: {
      id: alert.id,
    },
  });

  expect(persistedAlert?.resolvedAt).not.toBeNull();
  });
});