import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import app from "../../src/app";
import { prisma } from "../../src/database/prisma";
import { createSessionCookie } from "../helpers/auth-session";

// Dados próprios deste arquivo: dois clientes e três PCs (um sem cliente).
const CLIENT_PREFIX = "Filtro de Teste";
const AGENT_A = "7b2e1d3f-2222-4a5b-8c9d-000000000001";
const AGENT_B = "7b2e1d3f-2222-4a5b-8c9d-000000000002";
const AGENT_C = "7b2e1d3f-2222-4a5b-8c9d-000000000003";

let cookie: string;
let clientA: number;
let clientB: number;
let endpointA: number;
let endpointB: number;
let endpointC: number;

const get = (path: string) => request(app).get(path).set("Cookie", cookie);

async function cleanup() {
  await prisma.endpoint.deleteMany({
    where: { agentId: { in: [AGENT_A, AGENT_B, AGENT_C] } },
  });
  await prisma.client.deleteMany({
    where: { name: { startsWith: CLIENT_PREFIX } },
  });
}

function endpointIds(body: { data: Array<{ id?: number; endpointId?: number }> }) {
  return body.data.map((item) => item.id ?? item.endpointId);
}

function ownIds(ids: Array<number | undefined>) {
  return ids.filter((id) => [endpointA, endpointB, endpointC].includes(id as number));
}

beforeAll(async () => {
  cookie = await createSessionCookie();
  await cleanup();

  clientA = (await prisma.client.create({ data: { name: `${CLIENT_PREFIX} A` } })).id;
  clientB = (await prisma.client.create({ data: { name: `${CLIENT_PREFIX} B` } })).id;

  const create = (agentId: string, hostname: string, clientId?: number) =>
    prisma.endpoint.create({
      data: {
        agentId,
        hostname,
        ipAddress: "127.0.0.1",
        status: "ONLINE",
        lastSeenAt: new Date(),
        clientId,
      },
    });

  endpointA = (await create(AGENT_A, "FILTRO-A", clientA)).id;
  endpointB = (await create(AGENT_B, "FILTRO-B", clientB)).id;
  endpointC = (await create(AGENT_C, "FILTRO-C")).id;

  const now = new Date();

  await prisma.alert.createMany({
    data: [
      { endpointId: endpointA, metricType: "CPU", thresholdValue: 80, severity: "WARNING", triggeredAt: now },
      { endpointId: endpointB, metricType: "CPU", thresholdValue: 80, severity: "WARNING", triggeredAt: now },
      { endpointId: endpointC, metricType: "CPU", thresholdValue: 80, severity: "WARNING", triggeredAt: now },
      {
        endpointId: endpointA,
        metricType: "MEMORY",
        thresholdValue: 80,
        severity: "WARNING",
        triggeredAt: now,
        resolvedAt: now,
      },
    ],
  });
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("filter by client", () => {
  it("lists only the endpoints of the client", async () => {
    const response = await get(`/api/v1/endpoints?clientId=${clientA}`);

    expect(response.status).toBe(200);
    expect(endpointIds(response.body)).toEqual([endpointA]);
    expect(response.body.data[0].client).toEqual({ id: clientA, name: `${CLIENT_PREFIX} A` });
  });

  it("lists the endpoints without client with clientId=none", async () => {
    const response = await get("/api/v1/endpoints?clientId=none");

    expect(response.status).toBe(200);
    expect(ownIds(endpointIds(response.body))).toEqual([endpointC]);
    expect(response.body.data.every((item: { clientId: number | null }) => item.clientId === null)).toBe(true);
  });

  it("keeps listing every endpoint without the filter", async () => {
    const response = await get("/api/v1/endpoints");

    expect(ownIds(endpointIds(response.body)).sort()).toEqual(
      [endpointA, endpointB, endpointC].sort(),
    );
  });

  it("filters the health of the endpoints", async () => {
    const response = await get(`/api/v1/endpoints/health?clientId=${clientB}`);

    expect(response.status).toBe(200);
    expect(endpointIds(response.body)).toEqual([endpointB]);
  });

  it("filters active and resolved alerts", async () => {
    const active = await get(`/api/v1/alerts?clientId=${clientA}`);

    expect(active.status).toBe(200);
    expect(active.body.map((alert: { endpointId: number }) => alert.endpointId)).toEqual([endpointA]);

    const resolved = await get(`/api/v1/alerts?status=resolved&clientId=${clientA}`);

    expect(resolved.body).toHaveLength(1);
    expect(resolved.body[0].metricType).toBe("MEMORY");

    const withoutClient = await get("/api/v1/alerts?clientId=none");
    const ids = withoutClient.body.map((alert: { endpointId: number }) => alert.endpointId);

    expect(ids).toContain(endpointC);
    expect(ids).not.toContain(endpointA);
    expect(ids).not.toContain(endpointB);
  });

  it("returns an empty list for a client without endpoints", async () => {
    const response = await get("/api/v1/endpoints?clientId=999999");

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  it.each([
    "/api/v1/endpoints?clientId=abc",
    "/api/v1/endpoints/health?clientId=0",
    "/api/v1/alerts?clientId=-1",
  ])("rejects an invalid filter (%s)", async (path) => {
    expect((await get(path)).status).toBe(400);
  });
});
