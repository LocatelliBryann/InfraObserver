import { describe, expect, it, vi } from "vitest";

import { FileEventService } from "../../src/services/file-event.service";

describe("FileEventService", () => {
  it("should create a file event for an existing endpoint", async () => {
    const repository = {
      findEndpointByAgentId: vi.fn().mockResolvedValue({
        id: 1,
        agentId: "550e8400-e29b-41d4-a716-446655440000",
      }),
      create: vi.fn().mockResolvedValue({
        id: 1,
        endpointId: 1,
        username: "Bryann",
        eventType: "CREATE",
        filePath: "C:\\Users\\Bryann\\Documents\\test.txt",
        occurredAt: new Date("2026-09-15T22:00:00.000Z"),
        receivedAt: new Date("2026-09-15T22:00:01.000Z"),
      }),
    };

    const service = new FileEventService(repository);

    const input = {
      agentId: "550e8400-e29b-41d4-a716-446655440000",
      username: "Bryann",
      eventType: "CREATE",
      filePath: "C:\\Users\\Bryann\\Documents\\test.txt",
      occurredAt: new Date("2026-09-15T22:00:00.000Z"),
    };

    const result = await service.create(input);

    expect(repository.findEndpointByAgentId).toHaveBeenCalledWith(
      input.agentId,
    );

    expect(repository.create).toHaveBeenCalledWith({
      endpointId: 1,
      username: input.username,
      eventType: input.eventType,
      filePath: input.filePath,
      isDirectory: false,
      occurredAt: input.occurredAt,
      receivedAt: expect.any(Date),
    });

    expect(result).toBeDefined();
  });

  it("should list recent events with the default limit", async () => {
    const repository = {
      findEndpointByAgentId: vi.fn(),
      create: vi.fn(),
      findRecent: vi.fn().mockResolvedValue([]),
    };

    const service = new FileEventService(repository);

    await service.findRecent();

    expect(repository.findRecent).toHaveBeenCalledWith({ limit: 20 });
  });

  it("should forward endpoint and period filters", async () => {
    const repository = {
      findEndpointByAgentId: vi.fn(),
      create: vi.fn(),
      findRecent: vi.fn().mockResolvedValue([]),
    };

    const service = new FileEventService(repository);
    const from = new Date("2026-11-05T10:00:00.000Z");

    await service.findRecent({ endpointId: 3, from, limit: 50 });

    expect(repository.findRecent).toHaveBeenCalledWith({
      endpointId: 3,
      from,
      limit: 50,
    });
  });
});
