import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { OfflineDetectionJob } from "../../src/jobs/offline-detection.job";

describe("OfflineDetectionJob", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("should run the detection on every interval", async () => {
    const service = {
      detectOfflineEndpoints: vi.fn().mockResolvedValue([]),
    };
    const job = new OfflineDetectionJob(service, 60_000);

    job.start();

    await vi.advanceTimersByTimeAsync(60_000);
    expect(service.detectOfflineEndpoints).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(service.detectOfflineEndpoints).toHaveBeenCalledTimes(2);

    job.stop();

    await vi.advanceTimersByTimeAsync(60_000);
    expect(service.detectOfflineEndpoints).toHaveBeenCalledTimes(2);
  });

  it("should return how many endpoints went offline", async () => {
    const service = {
      detectOfflineEndpoints: vi.fn().mockResolvedValue([
        { id: 1, hostname: "PC-001" },
        { id: 2, hostname: "PC-002" },
      ]),
    };
    const job = new OfflineDetectionJob(service, 60_000);

    await expect(job.runOnce()).resolves.toBe(2);
    expect(console.warn).toHaveBeenCalledTimes(2);
  });

  it("should keep running when a detection fails", async () => {
    const service = {
      detectOfflineEndpoints: vi
        .fn()
        .mockRejectedValueOnce(new Error("database unavailable"))
        .mockResolvedValueOnce([]),
    };
    const job = new OfflineDetectionJob(service, 60_000);

    await expect(job.runOnce()).resolves.toBe(0);
    await expect(job.runOnce()).resolves.toBe(0);

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(service.detectOfflineEndpoints).toHaveBeenCalledTimes(2);
  });

  it("should not start two timers", async () => {
    const service = {
      detectOfflineEndpoints: vi.fn().mockResolvedValue([]),
    };
    const job = new OfflineDetectionJob(service, 60_000);

    job.start();
    job.start();

    await vi.advanceTimersByTimeAsync(60_000);
    expect(service.detectOfflineEndpoints).toHaveBeenCalledTimes(1);

    job.stop();
  });
});
