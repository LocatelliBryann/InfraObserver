import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

import { FileEventController } from "../../src/controllers/file-event.controller";

describe("FileEventController", () => {
  it("should create a file event and return 201", async () => {
    const event = {
      id: 1,
      endpointId: 1,
      username: "Bryann",
      eventType: "CREATE",
      filePath: "C:\\Users\\Bryann\\Documents\\test.txt",
      occurredAt: new Date("2026-09-15T22:00:00.000Z"),
      receivedAt: new Date("2026-09-15T22:00:01.000Z"),
    };

    const service = {
      create: vi.fn().mockResolvedValue(event),
    };

    const controller = new FileEventController(service);

    const req = {
      body: {
        agentId: "550e8400-e29b-41d4-a716-446655440000",
        username: "Bryann",
        eventType: "CREATE",
        filePath: "C:\\Users\\Bryann\\Documents\\test.txt",
        occurredAt: "2026-09-15T22:00:00.000Z",
      },
    } as Request;

    const json = vi.fn();

    const res = {
      status: vi.fn().mockReturnValue({ json }),
    } as unknown as Response;

    await controller.create(req, res);

    expect(service.create).toHaveBeenCalledWith({
      agentId: "550e8400-e29b-41d4-a716-446655440000",
      username: "Bryann",
      eventType: "CREATE",
      filePath: "C:\\Users\\Bryann\\Documents\\test.txt",
      occurredAt: expect.any(Date),
    });

    expect(res.status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith(event);
  });

  it("should return 400 when the payload is invalid", async () => {
    const service = {
      create: vi.fn(),
    };

    const controller = new FileEventController(service);

    const req = {
      body: {
        agentId: "550e8400-e29b-41d4-a716-446655440000",
        username: "Bryann",
        eventType: "INVALID",
        filePath: "C:\\Users\\Bryann\\Documents\\test.txt",
        occurredAt: "2026-09-15T22:00:00.000Z",
      },
    } as Request;

    const json = vi.fn();

    const res = {
      status: vi.fn().mockReturnValue({ json }),
    } as unknown as Response;

    await controller.create(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalled();
    expect(service.create).not.toHaveBeenCalled();
  });
});