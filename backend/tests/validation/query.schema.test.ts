import { describe, expect, it } from "vitest";

import {
  alertQuerySchema,
  fileEventQuerySchema,
  metricHistoryQuerySchema,
} from "../../src/utils/validation/query.schema";

describe("metricHistoryQuerySchema", () => {
  it("should apply the default limit", () => {
    const result = metricHistoryQuerySchema.parse({ endpointId: "3" });

    expect(result).toEqual({ endpointId: 3, limit: 20 });
  });

  it("should parse a period", () => {
    const result = metricHistoryQuerySchema.parse({
      endpointId: "3",
      from: "2026-11-05T10:00:00.000Z",
      to: "2026-11-05T11:00:00.000Z",
      limit: "60",
    });

    expect(result.from).toEqual(new Date("2026-11-05T10:00:00.000Z"));
    expect(result.to).toEqual(new Date("2026-11-05T11:00:00.000Z"));
    expect(result.limit).toBe(60);
  });

  it("should require endpointId", () => {
    expect(metricHistoryQuerySchema.safeParse({}).success).toBe(false);
  });

  it("should reject a period where from is after to", () => {
    const result = metricHistoryQuerySchema.safeParse({
      endpointId: "3",
      from: "2026-11-05T12:00:00.000Z",
      to: "2026-11-05T11:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("should reject invalid dates and limits", () => {
    expect(
      metricHistoryQuerySchema.safeParse({ endpointId: "3", from: "ontem" })
        .success,
    ).toBe(false);
    expect(
      metricHistoryQuerySchema.safeParse({ endpointId: "3", limit: "5000" })
        .success,
    ).toBe(false);
  });
});

describe("fileEventQuerySchema", () => {
  it("should allow listing events from every endpoint", () => {
    expect(fileEventQuerySchema.parse({})).toEqual({ limit: 20 });
  });

  it("should filter by endpoint", () => {
    expect(fileEventQuerySchema.parse({ endpointId: "7" })).toEqual({
      endpointId: 7,
      limit: 20,
    });
  });

  it("should reject an invalid endpointId", () => {
    expect(fileEventQuerySchema.safeParse({ endpointId: "abc" }).success).toBe(
      false,
    );
  });
});

describe("alertQuerySchema", () => {
  it("should default to active alerts", () => {
    expect(alertQuerySchema.parse({})).toEqual({
      status: "active",
      limit: 50,
    });
  });

  it("should accept resolved and all", () => {
    expect(alertQuerySchema.parse({ status: "resolved" }).status).toBe(
      "resolved",
    );
    expect(alertQuerySchema.parse({ status: "all" }).status).toBe("all");
  });

  it("should reject an unknown status", () => {
    expect(alertQuerySchema.safeParse({ status: "open" }).success).toBe(false);
  });
});
