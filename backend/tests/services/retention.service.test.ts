import { describe, expect, it, vi } from "vitest";

import { RetentionService } from "../../src/services/retention.service";

describe("RetentionService", () => {
  const now = new Date("2026-11-13T12:00:00.000Z");

  function createRepository() {
    return {
      deleteOlderThan: vi
        .fn()
        .mockResolvedValue({ metrics: 10, fileEvents: 4, alerts: 1 }),
    };
  }

  it("should delete what is older than the retention period", async () => {
    const repository = createRepository();
    const service = new RetentionService(repository, 60);

    const run = await service.purge(now);

    const cutoff = new Date("2026-09-14T12:00:00.000Z");
    expect(repository.deleteOlderThan).toHaveBeenCalledWith(cutoff);
    expect(run).toEqual({ cutoff, metrics: 10, fileEvents: 4, alerts: 1 });
  });

  it("should do nothing when retention is turned off", async () => {
    const repository = createRepository();
    const service = new RetentionService(repository, 0);

    expect(service.enabled).toBe(false);
    await expect(service.purge(now)).resolves.toBeNull();
    expect(repository.deleteOlderThan).not.toHaveBeenCalled();
  });

  it("should expose the configured number of days", () => {
    const service = new RetentionService(createRepository(), 30);

    expect(service.enabled).toBe(true);
    expect(service.days).toBe(30);
    expect(service.cutoffFor(now)).toEqual(
      new Date("2026-10-14T12:00:00.000Z"),
    );
  });
});
