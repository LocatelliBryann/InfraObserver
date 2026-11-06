import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

import { PrometheusController } from "../../src/controllers/prometheus.controller";

function createResponse() {
  const res = {
    status: vi.fn(),
    type: vi.fn(),
    send: vi.fn(),
    json: vi.fn(),
  };

  res.status.mockReturnValue(res);
  res.type.mockReturnValue(res);

  return res;
}

describe("PrometheusController", () => {
  it("should return metrics in Prometheus text format", async () => {
    const registry = {
      contentType: "text/plain; version=0.0.4; charset=utf-8",
      metrics: vi.fn().mockResolvedValue("http_requests_total 1"),
    };
    const controller = new PrometheusController(registry as never);
    const res = createResponse();

    await controller.metrics({} as Request, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.type).toHaveBeenCalledWith(registry.contentType);
    expect(res.send).toHaveBeenCalledWith("http_requests_total 1");
  });

  it("should return 500 and log when metrics fail", async () => {
    const registry = {
      contentType: "text/plain",
      metrics: vi.fn().mockRejectedValue(new Error("boom")),
    };
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const controller = new PrometheusController(registry as never, log);
    const res = createResponse();

    await controller.metrics({} as Request, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: "Internal server error" });
    expect(log.error).toHaveBeenCalledTimes(1);
  });
});
