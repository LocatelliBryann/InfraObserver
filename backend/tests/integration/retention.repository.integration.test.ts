import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "../../src/database/prisma";
import { PrismaRetentionRepository } from "../../src/repositories/retention.repository";

describe("PrismaRetentionRepository", () => {
  const repository = new PrismaRetentionRepository();
  // Datas bem antigas, para não apagar o que outros testes gravam em paralelo.
  const cutoff = new Date("2020-06-01T00:00:00.000Z");
  const old = new Date("2020-01-01T00:00:00.000Z");
  const recent = new Date("2026-11-01T00:00:00.000Z");

  let endpointId: number;
  let otherEndpointId: number;

  beforeAll(async () => {
    const [endpoint, other] = await Promise.all(
      ["retention-test", "retention-other"].map((hostname) =>
        prisma.endpoint.create({
          data: {
            agentId: crypto.randomUUID(),
            hostname,
            ipAddress: "127.0.0.1",
            status: "ONLINE",
          },
        }),
      ),
    );
    endpointId = endpoint.id;
    otherEndpointId = other.id;

    const oldMetric = await prisma.metric.create({
      data: { endpointId, cpuPercent: 95, collectedAt: old },
    });
    await prisma.metric.create({
      data: { endpointId, cpuPercent: 20, collectedAt: recent },
    });

    await prisma.fileEvent.createMany({
      data: [
        {
          endpointId,
          username: "old",
          eventType: "CREATE",
          filePath: "C:\\old.txt",
          occurredAt: old,
          receivedAt: old,
        },
        {
          // O relógio do PC estava atrasado: vale a data em que chegou.
          endpointId,
          username: "skewed",
          eventType: "CREATE",
          filePath: "C:\\skewed.txt",
          occurredAt: old,
          receivedAt: recent,
        },
      ],
    });

    await prisma.alert.createMany({
      data: [
        {
          // Resolvido e antigo: sai.
          endpointId,
          metricId: oldMetric.id,
          metricType: "CPU",
          thresholdValue: 90,
          severity: "CRITICAL",
          triggeredAt: old,
          resolvedAt: old,
        },
        {
          // Antigo, mas ainda aberto: fica.
          endpointId,
          metricType: "OFFLINE",
          thresholdValue: 0,
          severity: "CRITICAL",
          triggeredAt: old,
        },
        {
          endpointId,
          metricType: "MEMORY",
          thresholdValue: 90,
          severity: "WARNING",
          triggeredAt: recent,
          resolvedAt: recent,
        },
      ],
    });
  });

  afterAll(async () => {
    const ids = [endpointId, otherEndpointId];
    await prisma.alert.deleteMany({ where: { endpointId: { in: ids } } });
    await prisma.fileEvent.deleteMany({ where: { endpointId: { in: ids } } });
    await prisma.metric.deleteMany({ where: { endpointId: { in: ids } } });
    await prisma.endpoint.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it("should delete only what is older than the cutoff", async () => {
    const result = await repository.deleteOlderThan(cutoff);

    expect(result).toEqual({ metrics: 1, fileEvents: 1, alerts: 1 });

    const metrics = await prisma.metric.findMany({ where: { endpointId } });
    expect(metrics.map((metric) => metric.cpuPercent)).toEqual([20]);

    const events = await prisma.fileEvent.findMany({ where: { endpointId } });
    expect(events.map((event) => event.username)).toEqual(["skewed"]);

    const alerts = await prisma.alert.findMany({
      where: { endpointId },
      orderBy: { metricType: "asc" },
    });
    expect(alerts.map((alert) => alert.metricType)).toEqual([
      "MEMORY",
      "OFFLINE",
    ]);
  });

  it("should keep the endpoints themselves", async () => {
    await expect(
      prisma.endpoint.count({ where: { id: { in: [endpointId, otherEndpointId] } } }),
    ).resolves.toBe(2);
  });
});
