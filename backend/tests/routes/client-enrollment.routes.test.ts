import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import app from "../../src/app";
import { prisma } from "../../src/database/prisma";
import { createSessionCookie } from "../helpers/auth-session";

const SHARED_TOKEN = "test-agent-token";

process.env.AGENT_TOKENS = SHARED_TOKEN;

const CLIENT_PREFIX = "Cliente de Teste";
const AGENT_ID = "550e8400-e29b-41d4-a716-446655440030";
const OTHER_AGENT_ID = "550e8400-e29b-41d4-a716-446655440031";

const registration = {
  agentId: AGENT_ID,
  hostname: "PC-ENROLL-001",
  ipAddress: "192.168.0.30",
  osName: "Windows",
  osVersion: "11",
  agentVersion: "1.7.0",
};

let cookie: string;

async function cleanUp() {
  await prisma.endpoint.deleteMany({
    where: { agentId: { in: [AGENT_ID, OTHER_AGENT_ID] } },
  });
  await prisma.client.deleteMany({
    where: { name: { startsWith: CLIENT_PREFIX } },
  });
}

async function createClient(name = `${CLIENT_PREFIX} A`) {
  const response = await request(app)
    .post("/api/v1/clients")
    .set("Cookie", cookie)
    .send({ name });

  return response;
}

async function createToken(clientId: number, body: object = {}) {
  return request(app)
    .post(`/api/v1/clients/${clientId}/enrollment-tokens`)
    .set("Cookie", cookie)
    .send(body);
}

function enroll(token: string, body: object = registration) {
  return request(app)
    .post("/api/v1/agents/enroll")
    .set("Authorization", `Bearer ${token}`)
    .send(body);
}

function register(token: string, body: object = registration) {
  return request(app)
    .post("/api/v1/endpoints/register")
    .set("Authorization", `Bearer ${token}`)
    .send(body);
}

beforeAll(async () => {
  cookie = await createSessionCookie();
});

beforeEach(cleanUp);

afterAll(async () => {
  await cleanUp();
  await prisma.$disconnect();
});

describe("clients API", () => {
  it("requires login", async () => {
    expect((await request(app).get("/api/v1/clients")).status).toBe(401);
    expect(
      (await request(app).post("/api/v1/clients").send({ name: "X" })).status,
    ).toBe(401);
  });

  it("creates and lists clients", async () => {
    const created = await createClient();

    expect(created.status).toBe(201);
    expect(created.body.name).toBe(`${CLIENT_PREFIX} A`);

    const list = await request(app).get("/api/v1/clients").set("Cookie", cookie);
    const client = list.body.data.find(
      (item: { id: number }) => item.id === created.body.id,
    );

    expect(client).toMatchObject({ endpointCount: 0, activeTokenCount: 0 });
  });

  it("refuses a duplicated name, ignoring case", async () => {
    await createClient();

    const duplicated = await createClient(`${CLIENT_PREFIX.toUpperCase()} A`);

    expect(duplicated.status).toBe(409);
  });

  it("validates the name", async () => {
    expect((await createClient(" ")).status).toBe(400);
  });

  it("refuses requests from another site", async () => {
    const response = await request(app)
      .post("/api/v1/clients")
      .set("Cookie", cookie)
      .set("Origin", "https://site-malicioso.example")
      .send({ name: `${CLIENT_PREFIX} B` });

    expect(response.status).toBe(403);
  });
});

describe("enrollment tokens", () => {
  it("shows the token once and lists only its prefix", async () => {
    const client = await createClient();
    const created = await createToken(client.body.id, { expiresInDays: 30 });

    expect(created.status).toBe(201);
    expect(created.headers["cache-control"]).toBe("no-store");
    expect(created.body.token).toMatch(/^ioe_/);
    expect(created.body.enrollmentToken.expiresAt).not.toBeNull();

    const list = await request(app)
      .get(`/api/v1/clients/${client.body.id}/enrollment-tokens`)
      .set("Cookie", cookie);

    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].prefix).toBe(created.body.token.slice(0, 12));
    expect(JSON.stringify(list.body)).not.toContain(created.body.token);
    expect(list.body.data[0]).not.toHaveProperty("tokenHash");
  });

  it("answers 404 for an unknown client and 400 for invalid input", async () => {
    expect((await createToken(999999)).status).toBe(404);

    const client = await createClient();

    expect((await createToken(client.body.id, { expiresInDays: 0 })).status).toBe(400);
    expect(
      (
        await request(app)
          .post("/api/v1/clients/abc/enrollment-tokens")
          .set("Cookie", cookie)
          .send({})
      ).status,
    ).toBe(400);
  });
});

describe("copying an enrollment token again", () => {
  function reveal(clientId: number, tokenId: number) {
    return request(app)
      .post(`/api/v1/clients/${clientId}/enrollment-tokens/${tokenId}/reveal`)
      .set("Cookie", cookie);
  }

  it("returns the same token while it is active", async () => {
    const client = await createClient();
    const created = await createToken(client.body.id);

    expect(created.body.enrollmentToken.revealable).toBe(true);

    const revealed = await reveal(client.body.id, created.body.enrollmentToken.id);

    expect(revealed.status).toBe(200);
    expect(revealed.headers["cache-control"]).toBe("no-store");
    expect(revealed.body.token).toBe(created.body.token);

    // O valor guardado no banco é cifrado, não o token.
    const stored = await prisma.enrollmentToken.findUnique({
      where: { id: created.body.enrollmentToken.id },
    });

    expect(stored?.encryptedToken).toMatch(/^v1\./);
    expect(stored?.encryptedToken).not.toContain(created.body.token);
  });

  it("stops showing the token after it is revoked", async () => {
    const client = await createClient();
    const created = await createToken(client.body.id);
    const tokenId = created.body.enrollmentToken.id;

    await request(app)
      .post(`/api/v1/clients/${client.body.id}/enrollment-tokens/${tokenId}/revoke`)
      .set("Cookie", cookie);

    expect((await reveal(client.body.id, tokenId)).status).toBe(409);

    const stored = await prisma.enrollmentToken.findUnique({ where: { id: tokenId } });

    expect(stored?.encryptedToken).toBeNull();

    const list = await request(app)
      .get(`/api/v1/clients/${client.body.id}/enrollment-tokens`)
      .set("Cookie", cookie);

    expect(list.body.data[0].revealable).toBe(false);
    expect(list.body.data[0]).not.toHaveProperty("encryptedToken");
  });

  it("requires login and the same origin", async () => {
    const client = await createClient();
    const created = await createToken(client.body.id);
    const path = `/api/v1/clients/${client.body.id}/enrollment-tokens/${created.body.enrollmentToken.id}/reveal`;

    expect((await request(app).post(path)).status).toBe(401);
    expect(
      (
        await request(app)
          .post(path)
          .set("Cookie", cookie)
          .set("Origin", "https://site-malicioso.example")
      ).status,
    ).toBe(403);
    expect((await reveal(client.body.id, 999999)).status).toBe(404);
  });
});

describe("agent enrollment and revocation", () => {
  async function enrolledAgent() {
    const client = await createClient();
    const { body } = await createToken(client.body.id);
    const enrolled = await enroll(body.token);

    return {
      clientId: client.body.id as number,
      token: body.token as string,
      tokenId: body.enrollmentToken.id as number,
      enrolled,
    };
  }

  it("exchanges the enrollment token for an agent credential", async () => {
    const { clientId, enrolled } = await enrolledAgent();

    expect(enrolled.status).toBe(200);
    expect(enrolled.body.credential).toMatch(/^ioa_/);
    expect(enrolled.body.endpoint).toMatchObject({
      agentId: AGENT_ID,
      clientId,
      status: "ONLINE",
    });
    expect(enrolled.body.endpoint).not.toHaveProperty("credentialHash");
  });

  it("lets the credential register and send data only for its own agent", async () => {
    const { enrolled } = await enrolledAgent();
    const credential = enrolled.body.credential as string;

    const ownRegistration = await register(credential);

    expect(ownRegistration.status).toBe(200);
    expect(ownRegistration.body).not.toHaveProperty("credentialHash");

    const metric = await request(app)
      .post("/api/v1/metrics")
      .set("Authorization", `Bearer ${credential}`)
      .send({ agentId: AGENT_ID, cpuPercent: 10, collectedAt: new Date().toISOString() });

    expect(metric.status).toBe(201);

    const otherAgent = await register(credential, {
      ...registration,
      agentId: OTHER_AGENT_ID,
    });

    expect(otherAgent.status).toBe(403);
  });

  it("refuses the shared token for an enrolled agent", async () => {
    await enrolledAgent();

    expect((await register(SHARED_TOKEN)).status).toBe(403);
    // Outros PCs antigos continuam com o token compartilhado.
    expect(
      (await register(SHARED_TOKEN, { ...registration, agentId: OTHER_AGENT_ID })).status,
    ).toBe(200);
  });

  it("shows the client in the endpoint list without the credential hash", async () => {
    const { clientId } = await enrolledAgent();

    const list = await request(app).get("/api/v1/endpoints").set("Cookie", cookie);
    const endpoint = list.body.data.find(
      (item: { agentId: string }) => item.agentId === AGENT_ID,
    );

    expect(endpoint.client).toEqual({ id: clientId, name: `${CLIENT_PREFIX} A` });
    expect(endpoint).not.toHaveProperty("credentialHash");
    expect(endpoint.credentialIssuedAt).not.toBeNull();
  });

  it("revokes the endpoint and accepts a new installation afterwards", async () => {
    const { token, enrolled } = await enrolledAgent();
    const endpointId = enrolled.body.endpoint.id as number;

    const revoked = await request(app)
      .post(`/api/v1/endpoints/${endpointId}/revoke`)
      .set("Cookie", cookie);

    expect(revoked.status).toBe(200);
    expect(revoked.body.credentialRevokedAt).not.toBeNull();

    const refused = await register(enrolled.body.credential);

    expect(refused.status).toBe(401);
    expect(refused.body.message).toBe("Agent access revoked");
    expect((await register(SHARED_TOKEN)).status).toBe(403);

    const reinstalled = await enroll(token);

    expect(reinstalled.status).toBe(200);
    expect((await register(reinstalled.body.credential)).status).toBe(200);
  });

  it("requires login to revoke an endpoint", async () => {
    const { enrolled } = await enrolledAgent();

    const response = await request(app).post(
      `/api/v1/endpoints/${enrolled.body.endpoint.id}/revoke`,
    );

    expect(response.status).toBe(401);
    expect((await request(app).post("/api/v1/endpoints/999999/revoke").set("Cookie", cookie)).status).toBe(404);
  });

  it("stops new installations after the token is revoked", async () => {
    const { clientId, tokenId, token, enrolled } = await enrolledAgent();

    const revoked = await request(app)
      .post(`/api/v1/clients/${clientId}/enrollment-tokens/${tokenId}/revoke`)
      .set("Cookie", cookie);

    expect(revoked.status).toBe(200);
    expect(revoked.body.revokedAt).not.toBeNull();

    expect((await enroll(token, { ...registration, agentId: OTHER_AGENT_ID })).status).toBe(401);
    // O PC que já tinha entrado continua funcionando.
    expect((await register(enrolled.body.credential)).status).toBe(200);
  });

  it("refuses moving a PC to another client", async () => {
    await enrolledAgent();

    const other = await createClient(`${CLIENT_PREFIX} B`);
    const { body } = await createToken(other.body.id);

    expect((await enroll(body.token)).status).toBe(409);
  });

  it("validates the enrollment request", async () => {
    expect((await request(app).post("/api/v1/agents/enroll").send(registration)).status).toBe(401);
    expect((await enroll(SHARED_TOKEN)).status).toBe(401);
    expect((await enroll("ioe_desconhecido")).status).toBe(401);

    const { token } = await enrolledAgent();

    expect((await enroll(token, { ...registration, agentId: "x" })).status).toBe(400);
  });
});
