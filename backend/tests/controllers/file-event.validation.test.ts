import { describe, expect, it } from "vitest";

import { createFileEventSchema } from "../../src/utils/validation/file-event.schema";

describe("createFileEventSchema", () => {
  it("should reject an invalid event type", () => {
    const result = createFileEventSchema.safeParse({
      agentId: "550e8400-e29b-41d4-a716-446655440000",
      username: "Bryann",
      eventType: "INVALID",
      filePath: "C:\\Users\\Bryann\\Documents\\test.txt",
      occurredAt: "2026-09-15T22:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("should reject an invalid agentId", () => {
    const result = createFileEventSchema.safeParse({
      agentId: "invalid-agent-id",
      username: "Bryann",
      eventType: "CREATE",
      filePath: "C:\\Users\\Bryann\\Documents\\test.txt",
      occurredAt: "2026-09-15T22:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("should reject an empty file path", () => {
    const result = createFileEventSchema.safeParse({
      agentId: "550e8400-e29b-41d4-a716-446655440000",
      username: "Bryann",
      eventType: "CREATE",
      filePath: "",
      occurredAt: "2026-09-15T22:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });
});