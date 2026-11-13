import { afterEach, describe, expect, it } from "vitest";

import {
  DEFAULT_RETENTION_DAYS,
  getRetentionDays,
} from "../../src/config/retention";

describe("retention config", () => {
  const original = process.env.DATA_RETENTION_DAYS;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.DATA_RETENTION_DAYS;
    } else {
      process.env.DATA_RETENTION_DAYS = original;
    }
  });

  it("should keep data for 60 days by default", () => {
    delete process.env.DATA_RETENTION_DAYS;

    expect(DEFAULT_RETENTION_DAYS).toBe(60);
    expect(getRetentionDays()).toBe(60);
  });

  it("should use the default when the variable is empty", () => {
    process.env.DATA_RETENTION_DAYS = "  ";

    expect(getRetentionDays()).toBe(60);
  });

  it("should read the number of days from the environment", () => {
    process.env.DATA_RETENTION_DAYS = "90";

    expect(getRetentionDays()).toBe(90);
  });

  it("should accept 0 to turn the cleanup off", () => {
    process.env.DATA_RETENTION_DAYS = "0";

    expect(getRetentionDays()).toBe(0);
  });

  it.each(["-1", "1.5", "abc", "3651"])(
    "should reject %s",
    (value) => {
      process.env.DATA_RETENTION_DAYS = value;

      expect(() => getRetentionDays()).toThrow("DATA_RETENTION_DAYS");
    },
  );
});
