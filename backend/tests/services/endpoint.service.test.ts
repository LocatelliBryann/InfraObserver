import { describe, expect, it, vi } from "vitest";

import { EndpointService } from "../../src/services/endpoint.service";

describe("EndpointService", () => {
  it("should create a new endpoint when the agent is not registered", async () => {
    const repository = {
      findByAgentId: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: 1,
        agentId: "550e8400-e29b-41d4-a716-446655440000",
        hostname: "PC-001",
        ipAddress: "192.168.1.10",
        osName: "Windows",
        osVersion: "11",
        status: "ONLINE",
        lastSeenAt: new Date(),
      }),
      update: vi.fn(),
    };

    const service = new EndpointService(repository);

    const input = {
      agentId: "550e8400-e29b-41d4-a716-446655440000",
      hostname: "PC-001",
      ipAddress: "192.168.1.10",
      osName: "Windows",
      osVersion: "11",
    };

    const result = await service.register(input);

    expect(repository.findByAgentId).toHaveBeenCalledWith(input.agentId);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: input.agentId,
        hostname: input.hostname,
        ipAddress: input.ipAddress,
        osName: input.osName,
        osVersion: input.osVersion,
        status: "ONLINE",
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        agentId: input.agentId,
        hostname: input.hostname,
      }),
    );
  });

  it("should update an existing endpoint when the agent is already registered", async () => {
  const existingEndpoint = {
    id: 1,
    agentId: "550e8400-e29b-41d4-a716-446655440000",
    hostname: "PC-OLD",
    ipAddress: "192.168.1.10",
    osName: "Windows",
    osVersion: "10",
    status: "OFFLINE",
    lastSeenAt: new Date("2026-09-08T19:00:00.000Z"),
  };

  const updatedEndpoint = {
    ...existingEndpoint,
    hostname: "PC-001",
    osVersion: "11",
    status: "ONLINE",
  };

  const repository = {
    findByAgentId: vi.fn().mockResolvedValue(existingEndpoint),
    create: vi.fn(),
    update: vi.fn().mockResolvedValue(updatedEndpoint),
  };

  const service = new EndpointService(repository);

  const input = {
    agentId: existingEndpoint.agentId,
    hostname: "PC-001",
    ipAddress: "192.168.1.10",
    osName: "Windows",
    osVersion: "11",
  };

  const result = await service.register(input);

  expect(repository.findByAgentId).toHaveBeenCalledWith(input.agentId);

  expect(repository.update).toHaveBeenCalledWith(
    existingEndpoint.id,
    expect.objectContaining({
      hostname: input.hostname,
      ipAddress: input.ipAddress,
      osName: input.osName,
      osVersion: input.osVersion,
      status: "ONLINE",
    }),
  );

  expect(repository.create).not.toHaveBeenCalled();

  expect(result).toEqual(
    expect.objectContaining({
      id: existingEndpoint.id,
      agentId: input.agentId,
      hostname: input.hostname,
      status: "ONLINE",
    }),
  );
});
});