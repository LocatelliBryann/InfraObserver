import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";

import { AgentUpdateController } from "../../src/controllers/agent-update.controller";

function createResponse() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
    end: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return res as unknown as Response & typeof res;
}

describe("AgentUpdateController", () => {
  it("returns the release the agents should install", async () => {
    const release = { version: "1.5.0", url: "https://github.com/x", sha256: "c".repeat(64) };
    const controller = new AgentUpdateController({
      getAvailableRelease: vi.fn().mockResolvedValue(release),
    });
    const res = createResponse();

    await controller.available({} as Request, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(release);
  });

  it("answers 204 when there is nothing to install", async () => {
    const controller = new AgentUpdateController({
      getAvailableRelease: vi.fn().mockResolvedValue(null),
    });
    const res = createResponse();

    await controller.available({} as Request, res);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.end).toHaveBeenCalled();
  });
});
