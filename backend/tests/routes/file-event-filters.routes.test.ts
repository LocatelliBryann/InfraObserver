import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import app from "../../src/app";
import { prisma } from "../../src/database/prisma";
import { createSessionCookie } from "../helpers/auth-session";

// Dados próprios deste arquivo, isolados pelo agentId abaixo.
const AGENT = "6a1f0c2e-2222-4a5b-8c9d-000000000001";

let endpointId: number;
let sessionCookie: string;

async function cleanup() {
  await prisma.endpoint.deleteMany({ where: { agentId: AGENT } });
}

function list(query: Record<string, string | number>) {
  return request(app)
    .get("/api/v1/file-events")
    .query({ endpointId, ...query })
    .set("Cookie", sessionCookie);
}

describe("GET /api/v1/file-events filters", () => {
  beforeAll(async () => {
    sessionCookie = await createSessionCookie();
    await cleanup();

    const endpoint = await prisma.endpoint.create({
      data: {
        agentId: AGENT,
        hostname: "FILESERVER-01",
        ipAddress: "127.0.0.1",
        status: "ONLINE",
        lastSeenAt: new Date(),
      },
    });
    endpointId = endpoint.id;

    const base = new Date("2026-11-07T10:00:00.000Z").getTime();
    const events = [
      { eventType: "CREATE", filePath: "D:\\Financeiro\\relatorio.xlsx", username: "maria" },
      { eventType: "DELETE", filePath: "D:\\Financeiro\\antigo.xlsx", username: "joao.silva" },
      {
        eventType: "MOVE",
        filePath: "D:\\Arquivo\\contrato.pdf",
        previousPath: "D:\\Juridico\\contrato.pdf",
        username: "maria",
      },
      { eventType: "DELETE", filePath: "D:\\Juridico\\2025", username: "joao.silva", isDirectory: true },
    ];

    await prisma.fileEvent.createMany({
      data: events.map((event, index) => ({
        endpointId,
        receivedAt: new Date(),
        occurredAt: new Date(base + index * 60_000),
        ...event,
      })),
    });
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it("should filter by event type", async () => {
    const response = await list({ eventType: "DELETE,MOVE" });

    expect(response.status).toBe(200);
    expect(response.body.map((event: { eventType: string }) => event.eventType))
      .toEqual(["DELETE", "MOVE", "DELETE"]);
  });

  it("should search in the current path, previous path and user", async () => {
    const byPreviousPath = await list({ search: "juridico\\contrato" });
    expect(byPreviousPath.body).toHaveLength(1);
    expect(byPreviousPath.body[0]).toMatchObject({
      eventType: "MOVE",
      previousPath: "D:\\Juridico\\contrato.pdf",
    });

    const byUser = await list({ search: "JOAO" });
    expect(byUser.body).toHaveLength(2);
  });

  it("should return directory events with their flag", async () => {
    const response = await list({ eventType: "DELETE", search: "2025" });

    expect(response.body).toHaveLength(1);
    expect(response.body[0].isDirectory).toBe(true);
  });

  it("should reject an unknown event type", async () => {
    const response = await list({ eventType: "COPY" });

    expect(response.status).toBe(400);
  });
});
