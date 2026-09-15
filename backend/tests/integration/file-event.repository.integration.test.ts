import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "../../src/database/prisma";
import { PrismaFileEventRepository } from "../../src/repositories/file-event.repository";

describe("FileEventRepository integration", () => {
  const repository = new PrismaFileEventRepository();

  const agentId = randomUUID();
  let endpointId: number;

  beforeAll(async () => {
    const endpoint = await prisma.endpoint.create({
      data: {
        agentId,
        hostname: "PC-FILE-EVENT-INTEGRATION",
        ipAddress: "192.168.1.210",
        osName: "Windows",
        osVersion: "11",
        status: "ONLINE",
        lastSeenAt: new Date(),
      },
    });

    endpointId = endpoint.id;
  });

  afterAll(async () => {
    if (endpointId) {
      await prisma.fileEvent.deleteMany({
        where: {
          endpointId,
        },
      });

      await prisma.endpoint.delete({
        where: {
          id: endpointId,
        },
      });
    }

    await prisma.$disconnect();
  });

  it("should find an endpoint by agentId", async () => {
    const endpoint = await repository.findEndpointByAgentId(agentId);

    expect(endpoint).not.toBeNull();
    expect(endpoint?.id).toBe(endpointId);
    expect(endpoint?.agentId).toBe(agentId);
  });

  it("should create a file event using PostgreSQL", async () => {
    const occurredAt = new Date("2026-09-15T22:00:00.000Z");
    const receivedAt = new Date("2026-09-15T22:00:01.000Z");

    const fileEvent = await repository.create({
      endpointId,
      username: "Bryann",
      eventType: "CREATE",
      filePath: "C:\\Users\\Bryann\\Documents\\test.txt",
      occurredAt,
      receivedAt,
    });

    expect(fileEvent.id).toBeTypeOf("number");
    expect(fileEvent.endpointId).toBe(endpointId);
    expect(fileEvent.username).toBe("Bryann");
    expect(fileEvent.eventType).toBe("CREATE");
    expect(fileEvent.filePath).toBe(
      "C:\\Users\\Bryann\\Documents\\test.txt",
    );
    expect(fileEvent.occurredAt).toEqual(occurredAt);
    expect(fileEvent.receivedAt).toEqual(receivedAt);
  });
});