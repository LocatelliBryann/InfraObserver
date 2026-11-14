import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import app from "../../src/app";
import { prisma } from "../../src/database/prisma";
import { generateToken, hashToken } from "../../src/security/agent-tokens";
import { createSessionCookie } from "../helpers/auth-session";

// RF10: dashboard define as pastas (no cliente ou no PC), o agente busca e
// informa o que aplicou.
const SHARED_TOKEN = "token-compartilhado-pastas";
process.env.AGENT_TOKENS = SHARED_TOKEN;

const CLIENT_NAME = "Pastas de Teste";
const AGENT_ID = "6c1d2e3f-3333-4a5b-8c9d-000000000001";
const SERVER_AGENT_ID = "6c1d2e3f-3333-4a5b-8c9d-000000000002";
const LEGACY_AGENT_ID = "6c1d2e3f-3333-4a5b-8c9d-000000000003";

const credential = generateToken("ioa_");
const serverCredential = generateToken("ioa_");

let cookie: string;
let clientId: number;
let endpointId: number;
let serverEndpointId: number;

async function cleanup() {
  await prisma.endpoint.deleteMany({
    where: { agentId: { in: [AGENT_ID, SERVER_AGENT_ID, LEGACY_AGENT_ID] } },
  });
  await prisma.client.deleteMany({ where: { name: CLIENT_NAME } });
}

beforeAll(async () => {
  cookie = await createSessionCookie();
  await cleanup();

  clientId = (await prisma.client.create({ data: { name: CLIENT_NAME } })).id;

  const create = (agentId: string, hostname: string, token?: string, client?: number) =>
    prisma.endpoint.create({
      data: {
        agentId,
        hostname,
        ipAddress: "127.0.0.1",
        status: "ONLINE",
        lastSeenAt: new Date(),
        clientId: client,
        credentialHash: token ? hashToken(token) : undefined,
        credentialIssuedAt: token ? new Date() : undefined,
      },
    });

  endpointId = (await create(AGENT_ID, "PASTAS-ESTACAO", credential, clientId)).id;
  serverEndpointId = (await create(SERVER_AGENT_ID, "PASTAS-SERVIDOR", serverCredential, clientId)).id;
  await create(LEGACY_AGENT_ID, "PASTAS-ANTIGO");
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

const endpointPath = (id = endpointId) => `/api/v1/endpoints/${id}/monitored-directories`;
const clientPath = () => `/api/v1/clients/${clientId}/monitored-directories`;
const agentPath = (agentId = AGENT_ID) => `/api/v1/agents/${agentId}/config`;

const asAdmin = {
  get: (path: string) => request(app).get(path).set("Cookie", cookie),
  put: (path: string, body: object) => request(app).put(path).set("Cookie", cookie).send(body),
};

const asAgent = (token: string, agentId = AGENT_ID) =>
  request(app).get(agentPath(agentId)).set("Authorization", `Bearer ${token}`);

describe("Monitored directories (RF10)", () => {
  it("should require login in the dashboard routes", async () => {
    expect((await request(app).get(endpointPath())).status).toBe(401);
    expect((await request(app).put(endpointPath()).send({ mode: "inherit" })).status).toBe(401);
    expect((await request(app).get(clientPath())).status).toBe(401);
    expect((await request(app).put(clientPath()).send({ mode: "custom" })).status).toBe(401);
  });

  it("should refuse changes coming from another site", async () => {
    for (const path of [endpointPath(), clientPath()]) {
      const response = await request(app)
        .put(path)
        .set("Cookie", cookie)
        .set("Origin", "https://site-malicioso.example")
        .send({ mode: "custom", directories: [] });

      expect(response.status).toBe(403);
    }
  });

  it("should validate the folders and the mode", async () => {
    expect(
      (await asAdmin.put(endpointPath(), { mode: "custom", directories: ["Dados relativos"] }))
        .status,
    ).toBe(400);
    expect((await asAdmin.put(clientPath(), { mode: "inherit" })).status).toBe(400);
  });

  it("should return 404 for an unknown endpoint or client", async () => {
    expect((await asAdmin.get("/api/v1/endpoints/999999999/monitored-directories")).status).toBe(
      404,
    );
    expect((await asAdmin.get("/api/v1/clients/999999999/monitored-directories")).status).toBe(
      404,
    );
  });

  it("should start with the installation folders", async () => {
    const config = await asAgent(credential);

    expect(config.status).toBe(200);
    expect(config.body).toEqual({
      source: "installation",
      monitoredDirectories: [],
      updatedAt: null,
    });

    const view = await asAdmin.get(endpointPath());
    expect(view.body).toMatchObject({
      mode: "inherit",
      client: { id: clientId, name: CLIENT_NAME, mode: "installation" },
      effective: { source: "installation", directories: [] },
      pending: false,
    });
  });

  it("should apply the client list to every PC that follows the client", async () => {
    // Cartório: as estações não monitoram pastas locais, só enviam métricas.
    const saved = await asAdmin.put(clientPath(), { mode: "custom", directories: [] });

    expect(saved.status).toBe(200);
    expect(saved.body).toMatchObject({ mode: "custom", directories: [], customEndpointCount: 0 });

    for (const [token, agentId] of [
      [credential, AGENT_ID],
      [serverCredential, SERVER_AGENT_ID],
    ]) {
      const config = await asAgent(token, agentId);
      expect(config.body).toMatchObject({ source: "client", monitoredDirectories: [] });
      expect(config.body.updatedAt).not.toBeNull();
    }

    expect((await asAdmin.get(endpointPath())).body.pending).toBe(true);
  });

  it("should let one PC (the file server) keep its own list", async () => {
    const saved = await asAdmin.put(endpointPath(serverEndpointId), {
      mode: "custom",
      directories: ["D:\\Compartilhado\\Escrituras\\", "d:\\compartilhado\\escrituras", "D:\\Registros"],
    });

    expect(saved.status).toBe(200);
    expect(saved.body.effective).toEqual({
      source: "endpoint",
      directories: ["D:\\Compartilhado\\Escrituras", "D:\\Registros"],
    });

    const config = await asAgent(serverCredential, SERVER_AGENT_ID);
    expect(config.body).toMatchObject({
      source: "endpoint",
      monitoredDirectories: ["D:\\Compartilhado\\Escrituras", "D:\\Registros"],
    });

    // A estação continua seguindo o cliente.
    expect((await asAgent(credential)).body.source).toBe("client");
    expect((await asAdmin.get(clientPath())).body.customEndpointCount).toBe(1);
  });

  it("should save what the agent reports and stop showing it as pending", async () => {
    const report = await request(app)
      .post(`${agentPath(SERVER_AGENT_ID)}/status`)
      .set("Authorization", `Bearer ${serverCredential}`)
      .send({
        monitoredDirectories: ["D:\\Compartilhado\\Escrituras"],
        missingDirectories: ["D:\\Registros"],
      });

    expect(report.status).toBe(204);

    const view = await asAdmin.get(endpointPath(serverEndpointId));
    expect(view.body).toMatchObject({
      monitoredDirectories: ["D:\\Compartilhado\\Escrituras"],
      missingDirectories: ["D:\\Registros"],
      pending: false,
    });
    expect(view.body.reportedAt).not.toBeNull();
  });

  it("should go back to following the client", async () => {
    const saved = await asAdmin.put(endpointPath(serverEndpointId), { mode: "inherit" });

    expect(saved.body).toMatchObject({
      mode: "inherit",
      configuredDirectories: [],
      effective: { source: "client", directories: [] },
    });
    expect((await asAdmin.get(clientPath())).body.customEndpointCount).toBe(0);
  });

  it("should go back to the installation folders for the whole client", async () => {
    await asAdmin.put(clientPath(), { mode: "installation" });

    expect((await asAgent(credential)).body).toMatchObject({
      source: "installation",
      monitoredDirectories: [],
    });
  });

  it("should not let a PC read or change another PC's folders", async () => {
    expect((await asAgent(credential, SERVER_AGENT_ID)).status).toBe(403);

    // Mesmo com o próprio agentId no corpo, vale o da URL.
    const write = await request(app)
      .post(`${agentPath(SERVER_AGENT_ID)}/status`)
      .set("Authorization", `Bearer ${credential}`)
      .send({ agentId: AGENT_ID, monitoredDirectories: [], missingDirectories: [] });

    expect(write.status).toBe(403);
  });

  it("should accept the shared token only for PCs without their own credential", async () => {
    const legacy = await asAgent(SHARED_TOKEN, LEGACY_AGENT_ID);

    expect(legacy.status).toBe(200);
    expect(legacy.body.source).toBe("installation");
    expect((await asAgent(SHARED_TOKEN)).status).toBe(403);
  });

  it("should reject requests without a valid token or with a bad report", async () => {
    expect((await request(app).get(agentPath())).status).toBe(401);
    expect(
      (
        await request(app)
          .get("/api/v1/agents/nao-e-um-uuid/config")
          .set("Authorization", `Bearer ${credential}`)
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post(`${agentPath()}/status`)
          .set("Authorization", `Bearer ${credential}`)
          .send({ monitoredDirectories: "C:\\Dados" })
      ).status,
    ).toBe(400);
  });
});
