import { afterEach, describe, expect, it } from "vitest";

import {
  getCollectionIntervalMs,
  getOfflineCheckIntervalMs,
  getOfflineThresholdMs,
} from "../../src/config/monitoring";

describe("monitoring config", () => {
  const originalInterval = process.env.AGENT_COLLECTION_INTERVAL_SECONDS;
  const originalCheck = process.env.OFFLINE_CHECK_INTERVAL_SECONDS;

  afterEach(() => {
    process.env.AGENT_COLLECTION_INTERVAL_SECONDS = originalInterval;
    process.env.OFFLINE_CHECK_INTERVAL_SECONDS = originalCheck;
  });

  it("should use 60 seconds as the default collection interval", () => {
    delete process.env.AGENT_COLLECTION_INTERVAL_SECONDS;

    expect(getCollectionIntervalMs()).toBe(60_000);
  });

  it("should consider an endpoint offline after 3 collection intervals", () => {
    process.env.AGENT_COLLECTION_INTERVAL_SECONDS = "30";

    expect(getOfflineThresholdMs()).toBe(90_000);
  });

  it("should read the offline check interval from the environment", () => {
    process.env.OFFLINE_CHECK_INTERVAL_SECONDS = "120";

    expect(getOfflineCheckIntervalMs()).toBe(120_000);
  });

  it("should reject invalid intervals", () => {
    process.env.AGENT_COLLECTION_INTERVAL_SECONDS = "0";

    expect(() => getCollectionIntervalMs()).toThrow(
      "AGENT_COLLECTION_INTERVAL_SECONDS must be a positive integer",
    );

    process.env.AGENT_COLLECTION_INTERVAL_SECONDS = "abc";

    expect(() => getCollectionIntervalMs()).toThrow(
      "AGENT_COLLECTION_INTERVAL_SECONDS must be a positive integer",
    );
  });
});
