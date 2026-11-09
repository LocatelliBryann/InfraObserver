import { describe, expect, it, vi } from "vitest";

import type { AgentReleaseSource } from "../../src/services/agent-release.source";
import { AgentUpdateService } from "../../src/services/agent-update.service";

const RELEASE = {
  version: "1.5.0",
  url: "https://github.com/LocatelliBryann/InfraObserver/releases/download/v1.5.0/InfraObserverAgentSetup-1.5.0.exe",
  sha256: "b".repeat(64),
};

function createService(
  fetchRelease: AgentReleaseSource["fetchRelease"],
  options: { enabled?: boolean; pinnedVersion?: string } = {},
) {
  let now = 0;
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const source = { fetchRelease: vi.fn(fetchRelease) };
  const service = new AgentUpdateService(source, {
    enabled: options.enabled ?? true,
    pinnedVersion: options.pinnedVersion,
    logger,
    now: () => now,
  });

  return {
    service,
    source,
    logger,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe("AgentUpdateService", () => {
  it("returns the available release and keeps it for an hour", async () => {
    const { service, source, advance } = createService(async () => RELEASE);

    await expect(service.getAvailableRelease()).resolves.toEqual(RELEASE);
    advance(59 * 60 * 1000);
    await service.getAvailableRelease();
    expect(source.fetchRelease).toHaveBeenCalledTimes(1);

    advance(2 * 60 * 1000);
    await service.getAvailableRelease();
    expect(source.fetchRelease).toHaveBeenCalledTimes(2);
  });

  it("asks for the pinned version", async () => {
    const { service, source } = createService(async () => RELEASE, { pinnedVersion: "1.4.2" });

    await service.getAvailableRelease();

    expect(source.fetchRelease).toHaveBeenCalledWith("1.4.2");
  });

  it("does nothing when updates are disabled", async () => {
    const { service, source } = createService(async () => RELEASE, { enabled: false });

    await expect(service.getAvailableRelease()).resolves.toBeNull();
    expect(source.fetchRelease).not.toHaveBeenCalled();
  });

  it("makes a single request for agents asking at the same time", async () => {
    const { service, source } = createService(async () => RELEASE);

    const results = await Promise.all([
      service.getAvailableRelease(),
      service.getAvailableRelease(),
      service.getAvailableRelease(),
    ]);

    expect(results).toEqual([RELEASE, RELEASE, RELEASE]);
    expect(source.fetchRelease).toHaveBeenCalledTimes(1);
  });

  it("logs when the release has no installer and asks again after ten minutes", async () => {
    const { service, source, logger, advance } = createService(async () => null);

    await expect(service.getAvailableRelease()).resolves.toBeNull();
    advance(9 * 60 * 1000);
    await service.getAvailableRelease();
    expect(source.fetchRelease).toHaveBeenCalledTimes(1);
    advance(2 * 60 * 1000);
    await service.getAvailableRelease();
    expect(source.fetchRelease).toHaveBeenCalledTimes(2);
    expect(logger.warn).toHaveBeenCalledWith(
      { pinnedVersion: undefined },
      "No agent installer found in the releases",
    );
  });

  it("answers no update when GitHub fails and tries again after five minutes", async () => {
    const { service, source, logger, advance } = createService(async () => {
      throw new Error("offline");
    });

    await expect(service.getAvailableRelease()).resolves.toBeNull();
    await service.getAvailableRelease();
    expect(source.fetchRelease).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      "Could not check agent releases",
    );

    advance(5 * 60 * 1000 + 1);
    await service.getAvailableRelease();
    expect(source.fetchRelease).toHaveBeenCalledTimes(2);
  });

  it("uses the system clock by default", async () => {
    const service = new AgentUpdateService(
      { fetchRelease: async () => RELEASE },
      { enabled: true, logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } },
    );

    await expect(service.getAvailableRelease()).resolves.toEqual(RELEASE);
  });
});
