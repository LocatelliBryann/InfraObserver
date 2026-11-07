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

  it("should accept a move with the previous path", () => {
    const result = createFileEventSchema.safeParse({
      agentId: "550e8400-e29b-41d4-a716-446655440000",
      username: "Bryann",
      eventType: "MOVE",
      filePath: "C:\\Users\\Bryann\\Documents\\Arquivo\\nota.pdf",
      previousPath: "C:\\Users\\Bryann\\Downloads\\nota.pdf",
      occurredAt: "2026-11-07T10:00:00.000Z",
    });

    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      eventType: "MOVE",
      previousPath: "C:\\Users\\Bryann\\Downloads\\nota.pdf",
      isDirectory: false,
    });
  });

  it("should accept a directory event and a source IP", () => {
    const result = createFileEventSchema.safeParse({
      agentId: "550e8400-e29b-41d4-a716-446655440000",
      username: "joao.silva",
      eventType: "DELETE",
      filePath: "\\\\servidor\\financeiro\\2026",
      isDirectory: true,
      sourceIp: "192.168.1.45",
      occurredAt: "2026-11-07T10:00:00.000Z",
    });

    expect(result.success).toBe(true);
    expect(result.data?.isDirectory).toBe(true);
  });

  it("should reject an invalid source IP", () => {
    const result = createFileEventSchema.safeParse({
      agentId: "550e8400-e29b-41d4-a716-446655440000",
      username: "Bryann",
      eventType: "DELETE",
      filePath: "C:\\dados\\a.txt",
      sourceIp: "não é ip",
      occurredAt: "2026-11-07T10:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });

  it("should reject an unknown event type", () => {
    const result = createFileEventSchema.safeParse({
      agentId: "550e8400-e29b-41d4-a716-446655440000",
      username: "Bryann",
      eventType: "COPY",
      filePath: "C:\\dados\\a.txt",
      occurredAt: "2026-11-07T10:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });
});
