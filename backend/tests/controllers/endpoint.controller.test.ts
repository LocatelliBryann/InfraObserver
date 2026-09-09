import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

import { EndpointController } from "../../src/controllers/endpoint.controller";

describe("EndpointController", () => {
  it("should register an endpoint and return 200", async () => {
    const endpoint = {
      id: 1,
      agentId: "550e8400-e29b-41d4-a716-446655440000",
      hostname: "PC-001",
      ipAddress: "192.168.1.10",
      osName: "Windows",
      osVersion: "11",
      status: "ONLINE",
      lastSeenAt: new Date(),
    };

    const service = {
      register: vi.fn().mockResolvedValue(endpoint),
    };

    const controller = new EndpointController(service);

    const req = {
      body: {
        agentId: endpoint.agentId,
        hostname: endpoint.hostname,
        ipAddress: endpoint.ipAddress,
        osName: endpoint.osName,
        osVersion: endpoint.osVersion,
      },
    } as Request;

    const json = vi.fn();

    const res = {
      status: vi.fn().mockReturnValue({ json }),
    } as unknown as Response;

    await controller.register(req, res);

    expect(service.register).toHaveBeenCalledWith(req.body);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(endpoint);
  });
});