import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

import { MetricController } from "../../src/controllers/metric.controller";

describe("MetricController", () => {
  it("should create a metric and return 201", async () => {
    const metric = {
      id: 1,
      endpointId: 1,
      cpuPercent: 35.5,
      memoryUsed: 4096,
      memoryTotal: 8192,
      diskUsed: 50000,
      diskTotal: 100000,
      netBytesSent: BigInt(1000),
      netBytesRecv: BigInt(2000),
      collectedAt: new Date(),
    };

    const service = {
      create: vi.fn().mockResolvedValue(metric),
    };

    const controller = new MetricController(service);

    const req = {
      body: {
        agentId: "550e8400-e29b-41d4-a716-446655440000",
        cpuPercent: 35.5,
        memoryUsed: 4096,
        memoryTotal: 8192,
        diskUsed: 50000,
        diskTotal: 100000,
        netBytesSent: 1000,
        netBytesRecv: 2000,
        collectedAt: "2026-09-08T21:30:00.000Z",
      },
    } as Request;

    const json = vi.fn();

    const res = {
      status: vi.fn().mockReturnValue({ json }),
    } as unknown as Response;

    await controller.create(req, res);

    expect(service.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalled();
  });
});