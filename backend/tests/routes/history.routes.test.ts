import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import app from "../../src/app";
import { prisma } from "../../src/database/prisma";
import { createSessionCookie } from "../helpers/auth-session";

// Dados próprios deste arquivo, isolados pelos agentIds abaixo.
const AGENT_A = "6a1f0c2e-1111-4a5b-8c9d-000000000001";
const AGENT_B = "6a1f0c2e-1111-4a5b-8c9d-000000000002";

const base = new Date("2026-11-01T12:00:00.000Z");
const minutes = (value: number) => new Date(base.getTime() + value * 60_000);

let endpointA: number;
let endpointB: number;
let sessionCookie: string;

// As rotas de leitura exigem login de administrador.
const api = {
  get: (path: string) => request(app).get(path).set("Cookie", sessionCookie),
};

async function cleanup() {
  await prisma.endpoint.deleteMany({
    where: { agentId: { in: [AGENT_A, AGENT_B] } },
  });
}

describe("GET history routes", () => {
  beforeAll(async () => {
    sessionCookie = await createSessionCookie();
    await cleanup();

    const [a, b] = await Promise.all(
      [AGENT_A, AGENT_B].map((agentId, index) =>
        prisma.endpoint.create({
          data: {
            agentId,
            hostname: `HISTORY-${index + 1}`,
            ipAddress: "127.0.0.1",
            status: "ONLINE",
            lastSeenAt: new Date(),
          },
        }),
      ),
    );

    endpointA = a.id;
    endpointB = b.id;

    await prisma.metric.createMany({
      data: [0, 10, 20, 30].map((offset) => ({
        endpointId: endpointA,
        cpuPercent: offset,
        collectedAt: minutes(offset),
      })),
    });

    await prisma.fileEvent.createMany({
      data: [
        {
          endpointId: endpointA,
          username: "maria",
          eventType: "CREATE",
          filePath: "C:/a.txt",
          occurredAt: minutes(5),
          receivedAt: minutes(5),
        },
        {
          endpointId: endpointB,
          username: "joao",
          eventType: "DELETE",
          filePath: "C:/b.txt",
          occurredAt: minutes(15),
          receivedAt: minutes(15),
        },
      ],
    });

    await prisma.alert.createMany({
      data: [
        {
          endpointId: endpointA,
          metricType: "CPU",
          thresholdValue: 80,
          severity: "HIGH",
          triggeredAt: minutes(1),
          resolvedAt: minutes(3),
        },
        {
          endpointId: endpointA,
          metricType: "DISK",
          thresholdValue: 90,
          severity: "CRITICAL",
          triggeredAt: minutes(2),
        },
      ],
    });
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  describe("GET /api/v1/metrics", () => {
    it("should filter metrics by period", async () => {
      const response = await api.get("/api/v1/metrics").query({
        endpointId: endpointA,
        from: minutes(5).toISOString(),
        to: minutes(25).toISOString(),
        limit: 100,
      });

      expect(response.status).toBe(200);
      expect(response.body.map((m: { cpuPercent: number }) => m.cpuPercent))
        .toEqual([20, 10]);
    });

    it("should return 400 when the period is inverted", async () => {
      const response = await api.get("/api/v1/metrics").query({
        endpointId: endpointA,
        from: minutes(25).toISOString(),
        to: minutes(5).toISOString(),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("GET /api/v1/file-events", () => {
    it("should filter events by endpoint", async () => {
      const response = await api
        .get("/api/v1/file-events")
        .query({ endpointId: endpointB });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        endpointId: endpointB,
        username: "joao",
        endpoint: { hostname: "HISTORY-2" },
      });
    });

    it("should filter events by period", async () => {
      const response = await api.get("/api/v1/file-events").query({
        endpointId: endpointA,
        from: minutes(10).toISOString(),
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(0);
    });
  });

  describe("GET /api/v1/alerts", () => {
    it("should keep returning only active alerts by default", async () => {
      const response = await api
        .get("/api/v1/alerts")
        .query({ endpointId: endpointA });

      expect(response.status).toBe(200);
      expect(response.body.map((a: { metricType: string }) => a.metricType))
        .toEqual(["DISK"]);
    });

    it("should return resolved alerts for the history", async () => {
      const response = await api
        .get("/api/v1/alerts")
        .query({ endpointId: endpointA, status: "resolved" });

      expect(response.status).toBe(200);
      expect(response.body.map((a: { metricType: string }) => a.metricType))
        .toEqual(["CPU"]);
    });

    it("should return every alert with status=all", async () => {
      const response = await api
        .get("/api/v1/alerts")
        .query({ endpointId: endpointA, status: "all" });

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });
  });
});
