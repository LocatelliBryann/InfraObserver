import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import app from "../../src/app";
import { prisma } from "../../src/database/prisma";

describe("POST /api/v1/file-events", () => {
  const agentId = "550e8400-e29b-41d4-a716-446655440004";

  beforeEach(async () => {
    await prisma.fileEvent.deleteMany({
      where: {
        endpoint: {
          agentId,
        },
      },
    });

    await prisma.endpoint.deleteMany({
      where: {
        agentId,
      },
    });
  });

  afterAll(async () => {
    await prisma.fileEvent.deleteMany({
      where: {
        endpoint: {
          agentId,
        },
      },
    });

    await prisma.endpoint.deleteMany({
      where: {
        agentId,
      },
    });

    await prisma.$disconnect();
  });

  it("should create a file event for a registered endpoint", async () => {
    await prisma.endpoint.create({
      data: {
        agentId,
        hostname: "PC-FILE-EVENT-001",
        ipAddress: "192.168.1.40",
        osName: "Windows",
        osVersion: "11",
        status: "ONLINE",
        lastSeenAt: new Date(),
      },
    });

    const response = await request(app)
      .post("/api/v1/file-events")
      .send({
        agentId,
        username: "Bryann",
        eventType: "CREATE",
        filePath: "C:\\Users\\Bryann\\Documents\\test.txt",
        occurredAt: "2026-09-15T22:00:00.000Z",
      });

    expect(response.status).toBe(201);
    expect(response.body.username).toBe("Bryann");
    expect(response.body.eventType).toBe("CREATE");
    expect(response.body.filePath).toBe(
      "C:\\Users\\Bryann\\Documents\\test.txt",
    );
  });

  it("should return 404 when the endpoint is not registered", async () => {
    const response = await request(app)
      .post("/api/v1/file-events")
      .send({
        agentId,
        username: "Bryann",
        eventType: "CREATE",
        filePath: "C:\\Users\\Bryann\\Documents\\test.txt",
        occurredAt: "2026-09-15T22:00:00.000Z",
      });

    expect(response.status).toBe(404);
  });

  it("should return 400 when the payload is invalid", async () => {
    const response = await request(app)
      .post("/api/v1/file-events")
      .send({
        agentId,
        username: "Bryann",
        eventType: "INVALID",
        filePath: "C:\\Users\\Bryann\\Documents\\test.txt",
        occurredAt: "2026-09-15T22:00:00.000Z",
      });

    expect(response.status).toBe(400);
  });
});