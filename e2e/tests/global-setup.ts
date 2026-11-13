import { randomUUID } from "node:crypto";

import { request } from "@playwright/test";

import { adminCredentials, API_URL, SEEDED_FILE, SEEDED_HOSTNAME } from "./env";

// Antes dos testes: registra um PC pela API, do mesmo jeito que o agente faz
// (token de instalação, credencial própria, métrica e evento de arquivo), para
// o dashboard ter o que mostrar.
export default async function globalSetup() {
  const api = await request.newContext({ baseURL: API_URL });

  try {
    const login = await api.post("/api/v1/auth/login", { data: adminCredentials() });
    if (!login.ok()) {
      throw new Error(`Login do administrador falhou: ${login.status()}`);
    }

    const client = await api.post("/api/v1/clients", {
      data: { name: `E2E ${Date.now()}` },
    });
    if (!client.ok()) {
      throw new Error(`Criar cliente falhou: ${client.status()}`);
    }
    const { id: clientId } = (await client.json()) as { id: number };

    // Os testes filtram o dashboard por este cliente (variável herdada pelos workers).
    process.env.E2E_SEEDED_CLIENT_ID = String(clientId);

    const enrollmentToken = await api.post(
      `/api/v1/clients/${clientId}/enrollment-tokens`,
      { data: {} },
    );
    const { token } = (await enrollmentToken.json()) as { token: string };

    const agentId = randomUUID();
    const enroll = await api.post("/api/v1/agents/enroll", {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        agentId,
        hostname: SEEDED_HOSTNAME,
        ipAddress: "10.20.30.40",
        osName: "Windows",
        osVersion: "11",
        agentVersion: "1.9.0",
      },
    });
    if (!enroll.ok()) {
      throw new Error(`Registro do agente falhou: ${enroll.status()}`);
    }
    const { credential } = (await enroll.json()) as { credential: string };
    const agent = { Authorization: `Bearer ${credential}` };

    const metric = await api.post("/api/v1/metrics", {
      headers: agent,
      data: {
        agentId,
        cpuPercent: 37.5,
        memoryUsed: 7.2,
        memoryTotal: 16,
        diskUsed: 210,
        diskTotal: 512,
        collectedAt: new Date().toISOString(),
      },
    });
    if (!metric.ok()) {
      throw new Error(`Envio de métrica falhou: ${metric.status()}`);
    }

    const fileEvent = await api.post("/api/v1/file-events", {
      headers: agent,
      data: {
        agentId,
        username: "CARTORIO\\e2e.usuario",
        eventType: "CREATE",
        filePath: SEEDED_FILE,
        processName: "WINWORD.EXE",
        audited: true,
        occurredAt: new Date().toISOString(),
      },
    });
    if (!fileEvent.ok()) {
      throw new Error(`Envio de evento de arquivo falhou: ${fileEvent.status()}`);
    }
  } finally {
    await api.dispose();
  }
}
