import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

import { AlertController } from "../../src/controllers/alert.controller";

function buildResponse() {
  const json = vi.fn();
  const res = {
    status: vi.fn().mockReturnValue({ json }),
  } as unknown as Response;

  return { res, json };
}

describe("AlertController", () => {
  it("should return active alerts by default", async () => {
    const service = { findMany: vi.fn().mockResolvedValue([]) };
    const controller = new AlertController(service);
    const { res } = buildResponse();

    await controller.findAll({ query: {} } as unknown as Request, res);

    expect(service.findMany).toHaveBeenCalledWith({
      status: "active",
      limit: 50,
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("should forward the history filters", async () => {
    const service = { findMany: vi.fn().mockResolvedValue([]) };
    const controller = new AlertController(service);
    const { res } = buildResponse();

    await controller.findAll(
      {
        query: { status: "resolved", endpointId: "4", limit: "10" },
      } as unknown as Request,
      res,
    );

    expect(service.findMany).toHaveBeenCalledWith({
      status: "resolved",
      endpointId: 4,
      limit: 10,
    });
  });

  it("should return 400 for an invalid status", async () => {
    const service = { findMany: vi.fn() };
    const controller = new AlertController(service);
    const { res } = buildResponse();

    await controller.findAll(
      { query: { status: "open" } } as unknown as Request,
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(service.findMany).not.toHaveBeenCalled();
  });

  it("should return 500 when the service fails", async () => {
    const service = {
      findMany: vi.fn().mockRejectedValue(new Error("db down")),
    };
    const controller = new AlertController(service);
    const { res } = buildResponse();

    await controller.findAll({ query: {} } as unknown as Request, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});
