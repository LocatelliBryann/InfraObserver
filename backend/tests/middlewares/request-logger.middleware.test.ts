import { describe, expect, it } from "vitest";

import { resolveLogLevel } from "../../src/middlewares/request-logger.middleware";

describe("request logger", () => {
  it("should log successful requests as info", () => {
    expect(resolveLogLevel(200)).toBe("info");
    expect(resolveLogLevel(201)).toBe("info");
  });

  it("should log client errors as warn", () => {
    expect(resolveLogLevel(400)).toBe("warn");
    expect(resolveLogLevel(401)).toBe("warn");
  });

  it("should log server errors as error", () => {
    expect(resolveLogLevel(500)).toBe("error");
    expect(resolveLogLevel(200, new Error("boom"))).toBe("error");
  });
});
