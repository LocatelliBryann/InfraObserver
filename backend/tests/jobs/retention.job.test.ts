import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RetentionJob } from "../../src/jobs/retention.job";

describe("RetentionJob", () => {
  const log = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
  const cutoff = new Date("2026-09-14T12:00:00.000Z");

  function createService(enabled = true) {
    return {
      enabled,
      days: enabled ? 60 : 0,
      purge: vi.fn().mockResolvedValue({
        cutoff,
        metrics: 120,
        fileEvents: 8,
        alerts: 0,
      }),
    };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("should clean up on start and then once per interval", async () => {
    const service = createService();
    const job = new RetentionJob(service, 1_000, undefined, log);

    job.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(service.purge).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(service.purge).toHaveBeenCalledTimes(2);

    job.stop();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(service.purge).toHaveBeenCalledTimes(2);
  });

  it("should not start twice", async () => {
    const service = createService();
    const job = new RetentionJob(service, 1_000, undefined, log);

    job.start();
    job.start();
    await vi.advanceTimersByTimeAsync(1_000);

    expect(service.purge).toHaveBeenCalledTimes(2);
    job.stop();
  });

  it("should not schedule anything when retention is off", async () => {
    const service = createService(false);
    const job = new RetentionJob(service, 1_000, undefined, log);

    job.start();
    await vi.advanceTimersByTimeAsync(5_000);

    expect(service.purge).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalledWith(
      "Data retention disabled (DATA_RETENTION_DAYS=0)",
    );
  });

  it("should log and count what was removed", async () => {
    const service = createService();
    const counter = { inc: vi.fn() };
    const job = new RetentionJob(service, 1_000, counter, log);

    await job.runOnce();

    expect(counter.inc).toHaveBeenCalledWith({ table: "metric" }, 120);
    expect(counter.inc).toHaveBeenCalledWith({ table: "file_event" }, 8);
    // Nada apagado de alertas: o contador não é tocado.
    expect(counter.inc).toHaveBeenCalledTimes(2);
    expect(log.info).toHaveBeenCalledWith(
      {
        cutoff: cutoff.toISOString(),
        metrics: 120,
        fileEvents: 8,
        alerts: 0,
      },
      "Old data removed by retention policy",
    );
  });

  it("should keep running when a cleanup fails", async () => {
    const service = createService();
    service.purge.mockRejectedValueOnce(new Error("database down"));
    const job = new RetentionJob(service, 1_000, undefined, log);

    await expect(job.runOnce()).resolves.toBeNull();
    expect(log.error).toHaveBeenCalledWith(
      { err: expect.any(Error) },
      "Data retention job failed",
    );

    await expect(job.runOnce()).resolves.toMatchObject({ metrics: 120 });
  });

  it("should skip a run while the previous one is still going", async () => {
    const service = createService();
    let finish: () => void = () => undefined;
    service.purge.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = () =>
            resolve({ cutoff, metrics: 0, fileEvents: 0, alerts: 0 });
        }),
    );
    const job = new RetentionJob(service, 1_000, undefined, log);

    const first = job.runOnce();
    await expect(job.runOnce()).resolves.toBeNull();

    finish();
    await first;
    expect(service.purge).toHaveBeenCalledTimes(1);
  });
});
