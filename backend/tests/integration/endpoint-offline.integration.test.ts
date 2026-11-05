import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "../../src/database/prisma";
import { PrismaAlertRepository } from "../../src/repositories/alert.repository";
import { PrismaEndpointRepository } from "../../src/repositories/endpoint.repository";

describe("Offline detection integration", () => {
  const endpointRepository = new PrismaEndpointRepository();
  const alertRepository = new PrismaAlertRepository();

  const cutoff = new Date(Date.now() - 3 * 60 * 1000);
  const agentIds = {
    fresh: randomUUID(),
    stale: randomUUID(),
    neverSeen: randomUUID(),
    alreadyOffline: randomUUID(),
  };

  const endpointIds: Record<keyof typeof agentIds, number> = {
    fresh: 0,
    stale: 0,
    neverSeen: 0,
    alreadyOffline: 0,
  };

  beforeAll(async () => {
    const definitions: Array<{
      key: keyof typeof agentIds;
      status: string;
      lastSeenAt: Date | null;
    }> = [
      { key: "fresh", status: "ONLINE", lastSeenAt: new Date() },
      {
        key: "stale",
        status: "ONLINE",
        lastSeenAt: new Date(Date.now() - 10 * 60 * 1000),
      },
      { key: "neverSeen", status: "ONLINE", lastSeenAt: null },
      {
        key: "alreadyOffline",
        status: "OFFLINE",
        lastSeenAt: new Date(Date.now() - 10 * 60 * 1000),
      },
    ];

    for (const definition of definitions) {
      const endpoint = await prisma.endpoint.create({
        data: {
          agentId: agentIds[definition.key],
          hostname: `offline-${definition.key}`,
          ipAddress: "127.0.0.1",
          status: definition.status,
          lastSeenAt: definition.lastSeenAt,
        },
      });

      endpointIds[definition.key] = endpoint.id;
    }
  });

  afterAll(async () => {
    await prisma.endpoint.deleteMany({
      where: {
        agentId: {
          in: Object.values(agentIds),
        },
      },
    });

    await prisma.$disconnect();
  });

  it("should find only ONLINE endpoints not seen since the cutoff", async () => {
    const endpoints =
      await endpointRepository.findOnlineNotSeenSince(cutoff);

    const ourIds = endpoints
      .map((endpoint) => endpoint.id)
      .filter((id) => Object.values(endpointIds).includes(id))
      .sort((a, b) => a - b);

    expect(ourIds).toEqual(
      [endpointIds.stale, endpointIds.neverSeen].sort((a, b) => a - b),
    );
  });

  it("should store an OFFLINE alert without a metric", async () => {
    const alert = await alertRepository.create({
      endpointId: endpointIds.stale,
      metricId: null,
      metricType: "OFFLINE",
      thresholdValue: 180,
      severity: "CRITICAL",
      triggeredAt: new Date(),
    });

    expect(alert.metricId).toBeNull();

    const activeAlert =
      await alertRepository.findActiveByEndpointAndMetricType(
        endpointIds.stale,
        "OFFLINE",
      );

    expect(activeAlert?.id).toBe(alert.id);
  });
});
