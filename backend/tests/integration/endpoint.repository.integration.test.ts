import { randomUUID } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";

import { prisma } from "../../src/database/prisma";
import { PrismaEndpointRepository } from "../../src/repositories/endpoint.repository";

describe("EndpointRepository integration", () => {
  const repository = new PrismaEndpointRepository();

  const agentId = randomUUID();

  afterAll(async () => {
    await prisma.endpoint.deleteMany({
      where: {
        agentId,
      },
    });

    await prisma.$disconnect();
  });

  it("should create and find an endpoint using PostgreSQL", async () => {
    const endpoint = await repository.create({
      agentId,
      hostname: "PC-INTEGRATION-001",
      ipAddress: "192.168.1.100",
      osName: "Windows",
      osVersion: "11",
      status: "ONLINE",
      lastSeenAt: new Date(),
    });

    expect(endpoint.id).toBeTypeOf("number");
    expect(endpoint.agentId).toBe(agentId);
    expect(endpoint.hostname).toBe("PC-INTEGRATION-001");
    expect(endpoint.status).toBe("ONLINE");

    const foundEndpoint = await repository.findByAgentId(agentId);

    expect(foundEndpoint).not.toBeNull();
    expect(foundEndpoint?.id).toBe(endpoint.id);
    expect(foundEndpoint?.agentId).toBe(agentId);
  });

  it("should update an existing endpoint using PostgreSQL", async () => {
    const existingEndpoint = await repository.findByAgentId(agentId);

    expect(existingEndpoint).not.toBeNull();

    const updatedEndpoint = await repository.update(existingEndpoint!.id, {
      hostname: "PC-INTEGRATION-UPDATED",
      ipAddress: "192.168.1.101",
      status: "ONLINE",
      lastSeenAt: new Date(),
    });

    expect(updatedEndpoint.hostname).toBe("PC-INTEGRATION-UPDATED");
    expect(updatedEndpoint.ipAddress).toBe("192.168.1.101");
    expect(updatedEndpoint.status).toBe("ONLINE");
  });
});