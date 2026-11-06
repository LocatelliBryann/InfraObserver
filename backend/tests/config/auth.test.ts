import { afterEach, describe, expect, it, vi } from "vitest";

import {
  assertAuthConfiguration,
  getAllowedOrigins,
  getJwtSecret,
  getSessionDurationSeconds,
} from "../../src/config/auth";

describe("auth config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("should use the configured JWT secret", () => {
    vi.stubEnv("JWT_SECRET", "a".repeat(40));

    expect(getJwtSecret()).toBe("a".repeat(40));
  });

  it("should reject a short JWT secret", () => {
    vi.stubEnv("JWT_SECRET", "curto");

    expect(() => getJwtSecret()).toThrow("at least 32 characters");
  });

  it("should require JWT_SECRET in production", () => {
    vi.stubEnv("JWT_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");

    expect(() => assertAuthConfiguration()).toThrow("JWT_SECRET is not configured");
  });

  it("should fall back to a development secret outside production", () => {
    vi.stubEnv("JWT_SECRET", "");
    vi.stubEnv("NODE_ENV", "development");

    expect(getJwtSecret().length).toBeGreaterThanOrEqual(32);
  });

  it("should default sessions to 8 hours", () => {
    vi.stubEnv("SESSION_HOURS", "");

    expect(getSessionDurationSeconds()).toBe(8 * 60 * 60);
  });

  it("should read and validate SESSION_HOURS", () => {
    vi.stubEnv("SESSION_HOURS", "2");
    expect(getSessionDurationSeconds()).toBe(7200);

    vi.stubEnv("SESSION_HOURS", "zero");
    expect(() => getSessionDurationSeconds()).toThrow("SESSION_HOURS");
  });

  it("should parse the allowed origins", () => {
    vi.stubEnv("CORS_ORIGINS", "http://a.com, http://b.com ,");
    expect(getAllowedOrigins()).toEqual(["http://a.com", "http://b.com"]);

    vi.stubEnv("CORS_ORIGINS", "");
    expect(getAllowedOrigins()).toEqual(["http://localhost:5173"]);
  });
});
