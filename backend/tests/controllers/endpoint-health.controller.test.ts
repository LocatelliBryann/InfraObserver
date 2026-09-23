import type { Request, Response } from "express";

import { describe, expect, it, vi } from "vitest";

import { EndpointHealthController } from "../../src/controllers/endpoint-health.controller";

describe("EndpointHealthController", () => {
  it("deve retornar a saúde dos endpoints com status 200", async () => {
    const health = [
      {
        endpointId: 1,
        hostname: "PC-001",
        isOnline: true,
        isStale: false,
        latestMetric: null,
      },
    ];

    const service = {
      findAll: vi.fn().mockResolvedValue(health),
    };

    const controller = new EndpointHealthController(service);

    const req = {} as Request;

    const json = vi.fn();

    const res = {
      status: vi.fn().mockReturnValue({ json }),
    } as unknown as Response;

    await controller.findAll(req, res);

    expect(service.findAll).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      data: health,
    });
  });

  it("deve retornar status 500 quando o service falhar", async () => {
    const service = {
      findAll: vi
        .fn()
        .mockRejectedValue(new Error("Database error")),
    };

    const controller = new EndpointHealthController(service);

    const req = {} as Request;

    const json = vi.fn();

    const res = {
      status: vi.fn().mockReturnValue({ json }),
    } as unknown as Response;

    await controller.findAll(req, res);

    expect(service.findAll).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      message: "Internal server error",
    });
  });
});