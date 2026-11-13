// Teste de carga do InfraObserver (RFC v1.1, seção 7.1 e RNF04).
//
// Simula N computadores com o agente (padrão 50) enviando métricas no
// intervalo real do agente (60 s) e alguns administradores com o dashboard
// aberto, que consulta a API a cada 30 s. Critério de aceite: 95% das
// requisições em menos de 300 ms e nenhuma falha.
//
// Cada PC simulado entra no sistema como um PC de verdade: troca um token de
// instalação pela credencial própria (POST /api/v1/agents/enroll) e depois
// envia métricas e eventos de arquivo com essa credencial.
//
// Uso (veja docs/validacao.md):
//   k6 run -e BASE_URL=http://localhost:3000 \
//          -e ADMIN_EMAIL=... -e ADMIN_PASSWORD=... validation/load/infraobserver.js
//
// Variáveis opcionais: AGENTS (50), DASHBOARDS (3), DURATION (10m),
// INTERVAL_SECONDS (60, intervalo de envio de cada PC), RESULTS_DIR (validation/load/results).

import http from "k6/http";
import { check, fail, sleep } from "k6";
import { Counter } from "k6/metrics";

const BASE_URL = (__ENV.BASE_URL || "http://localhost:3000").replace(/\/+$/, "");
const AGENTS = Number(__ENV.AGENTS || 50);
const DASHBOARDS = Number(__ENV.DASHBOARDS || 3);
const DURATION = __ENV.DURATION || "10m";
const INTERVAL_SECONDS = Number(__ENV.INTERVAL_SECONDS || 60);
const DASHBOARD_REFRESH_SECONDS = 30;
const RESULTS_DIR = __ENV.RESULTS_DIR || "validation/load/results";

const metricsSent = new Counter("infraobserver_metrics_sent");
const fileEventsSent = new Counter("infraobserver_file_events_sent");

export const options = {
  scenarios: {
    agents: {
      executor: "constant-vus",
      vus: AGENTS,
      duration: DURATION,
      exec: "agent",
      gracefulStop: "30s",
    },
    dashboard: {
      executor: "constant-vus",
      vus: DASHBOARDS,
      duration: DURATION,
      exec: "dashboard",
      gracefulStop: "30s",
    },
  },
  thresholds: {
    // Critério da RFC: 95% das requisições em menos de 300 ms, sem erros.
    "http_req_duration{scenario:agents}": ["p(95)<300"],
    "http_req_duration{scenario:dashboard}": ["p(95)<300"],
    http_req_failed: ["rate<0.01"],
    checks: ["rate>0.99"],
  },
  summaryTrendStats: ["avg", "min", "med", "p(90)", "p(95)", "p(99)", "max"],
};

function json(body) {
  return {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

// O cookie de sessão vai por cabeçalho: fora de HTTPS o k6 não reenvia
// cookies marcados como Secure.
function sessionHeaders(cookie) {
  return { headers: { Cookie: cookie, "Content-Type": "application/json" } };
}

// Uma vez, antes do teste: login do administrador, um cliente só para o
// teste e um token de instalação desse cliente.
export function setup() {
  if (!__ENV.ADMIN_EMAIL || !__ENV.ADMIN_PASSWORD) {
    fail("Informe ADMIN_EMAIL e ADMIN_PASSWORD (-e ADMIN_EMAIL=... -e ADMIN_PASSWORD=...)");
  }

  const health = http.get(`${BASE_URL}/health`);
  if (health.status !== 200) {
    fail(`API fora do ar em ${BASE_URL} (health: ${health.status})`);
  }

  const login = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ email: __ENV.ADMIN_EMAIL, password: __ENV.ADMIN_PASSWORD }),
    { headers: { "Content-Type": "application/json" } },
  );
  if (login.status !== 200) {
    fail(`Login do administrador falhou (status ${login.status})`);
  }

  const sessionCookie = login.cookies.infraobserver_session;
  if (!sessionCookie || sessionCookie.length === 0) {
    fail("A resposta do login não trouxe o cookie de sessão");
  }
  const cookie = `infraobserver_session=${sessionCookie[0].value}`;

  const clientName = `Teste de carga ${new Date().toISOString().slice(0, 16)}`;
  const client = http.post(
    `${BASE_URL}/api/v1/clients`,
    JSON.stringify({ name: clientName }),
    sessionHeaders(cookie),
  );
  if (client.status !== 201) {
    fail(`Não foi possível criar o cliente do teste (status ${client.status})`);
  }

  const clientId = client.json("id");
  const enrollment = http.post(
    `${BASE_URL}/api/v1/clients/${clientId}/enrollment-tokens`,
    JSON.stringify({ expiresInDays: 1 }),
    sessionHeaders(cookie),
  );
  if (enrollment.status !== 201) {
    fail(`Não foi possível gerar o token de instalação (status ${enrollment.status})`);
  }

  return {
    // Muda a cada execução: os PCs simulados de um teste não colidem com os
    // de outro (cada PC pertence a um só cliente).
    runId: Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0"),
    cookie,
    clientId,
    clientName,
    enrollmentToken: enrollment.json("token"),
    enrollmentTokenId: enrollment.json("enrollmentToken.id"),
  };
}

// Identificador por PC simulado: UUID v4 válido, com a execução e o número do VU.
function agentIdFor(runId, vu) {
  const hex = vu.toString(16).padStart(12, "0");
  return `${runId}-0000-4000-8000-${hex}`;
}

// Estado de cada VU (cada VU é um PC).
let credential = null;
let networkSent = 0;
let networkReceived = 0;

function enroll(data) {
  const agentId = agentIdFor(data.runId, __VU);
  const response = http.post(
    `${BASE_URL}/api/v1/agents/enroll`,
    JSON.stringify({
      agentId,
      hostname: `K6-PC-${String(__VU).padStart(3, "0")}`,
      ipAddress: `10.99.${Math.floor(__VU / 250)}.${(__VU % 250) + 1}`,
      osName: "Windows",
      osVersion: "11",
      agentVersion: "1.9.0",
    }),
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.enrollmentToken}`,
      },
      tags: { name: "POST /agents/enroll" },
    },
  );

  check(response, { "enroll: 200": (r) => r.status === 200 });
  credential = response.status === 200 ? response.json("credential") : null;
}

export function agent(data) {
  // Os PCs não ligam todos no mesmo segundo.
  if (credential === null) {
    sleep(Math.random() * Math.min(INTERVAL_SECONDS, 10));
    enroll(data);

    if (credential === null) {
      sleep(INTERVAL_SECONDS);
      return;
    }
  }

  const agentId = agentIdFor(data.runId, __VU);
  const auth = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${credential}`,
  };

  networkSent += Math.floor(Math.random() * 5_000_000);
  networkReceived += Math.floor(Math.random() * 20_000_000);

  const metric = http.post(
    `${BASE_URL}/api/v1/metrics`,
    JSON.stringify({
      agentId,
      cpuPercent: Math.round((15 + Math.random() * 50) * 10) / 10,
      memoryUsed: 6 + Math.random() * 4,
      memoryTotal: 16,
      diskUsed: 250 + Math.random() * 10,
      diskTotal: 512,
      netBytesSent: networkSent,
      netBytesRecv: networkReceived,
      collectedAt: new Date().toISOString(),
    }),
    { headers: auth, tags: { name: "POST /metrics" } },
  );
  check(metric, { "metric: 201": (r) => r.status === 201 });
  metricsSent.add(1);

  // Em média, um evento de arquivo a cada três envios.
  if (Math.random() < 1 / 3) {
    const types = ["CREATE", "MODIFY", "DELETE"];
    const event = http.post(
      `${BASE_URL}/api/v1/file-events`,
      JSON.stringify({
        agentId,
        username: `K6\\usuario${__VU}`,
        eventType: types[Math.floor(Math.random() * types.length)],
        filePath: `C:\\Users\\usuario${__VU}\\Documents\\teste-${__ITER}.docx`,
        audited: true,
        processName: "explorer.exe",
        occurredAt: new Date().toISOString(),
      }),
      { headers: auth, tags: { name: "POST /file-events" } },
    );
    check(event, { "file event: 201": (r) => r.status === 201 });
    fileEventsSent.add(1);
  }

  sleep(INTERVAL_SECONDS);
}

// Um administrador com o dashboard aberto: as mesmas consultas que a tela
// faz a cada atualização automática.
export function dashboard(data) {
  const params = sessionHeaders(data.cookie);
  const filter = `clientId=${data.clientId}`;

  const responses = http.batch([
    ["GET", `${BASE_URL}/api/v1/endpoints?${filter}`, null, { ...params, tags: { name: "GET /endpoints" } }],
    ["GET", `${BASE_URL}/api/v1/endpoints/health?${filter}`, null, { ...params, tags: { name: "GET /endpoints/health" } }],
    ["GET", `${BASE_URL}/api/v1/alerts?${filter}`, null, { ...params, tags: { name: "GET /alerts" } }],
    ["GET", `${BASE_URL}/api/v1/file-events?limit=20`, null, { ...params, tags: { name: "GET /file-events" } }],
  ]);

  responses.forEach((response) => {
    check(response, { "dashboard: 200": (r) => r.status === 200 });
  });

  // Gráfico do PC selecionado: as últimas 20 métricas de um PC do teste.
  const endpoints = responses[0].status === 200 ? responses[0].json("data") : [];
  if (Array.isArray(endpoints) && endpoints.length > 0) {
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    const metrics = http.get(
      `${BASE_URL}/api/v1/metrics?endpointId=${endpoint.id}&limit=20`,
      { ...params, tags: { name: "GET /metrics" } },
    );
    check(metrics, { "dashboard: 200": (r) => r.status === 200 });
  }

  sleep(DASHBOARD_REFRESH_SECONDS);
}

// Depois do teste: revoga o token de instalação. Os PCs simulados ficam no
// cliente "Teste de carga ..." (veja docs/validacao.md para removê-los).
export function teardown(data) {
  http.post(
    `${BASE_URL}/api/v1/clients/${data.clientId}/enrollment-tokens/${data.enrollmentTokenId}/revoke`,
    null,
    sessionHeaders(data.cookie),
  );
}

// ---------- Resumo ----------

function metricValue(metrics, name, stat) {
  const metric = metrics[name];
  if (!metric || !metric.values || metric.values[stat] === undefined) {
    return null;
  }
  return metric.values[stat];
}

function ms(value) {
  return value === null ? "-" : `${value.toFixed(1)} ms`;
}

function thresholdsPassed(metrics) {
  return Object.values(metrics).every((metric) =>
    Object.values(metric.thresholds || {}).every((threshold) => threshold.ok),
  );
}

export function handleSummary(summary) {
  const m = summary.metrics;
  const agentsKey = "http_req_duration{scenario:agents}";
  const dashboardKey = "http_req_duration{scenario:dashboard}";
  const passed = thresholdsPassed(m);
  const failedRate = metricValue(m, "http_req_failed", "rate");

  const lines = [
    "# Teste de carga do InfraObserver",
    "",
    `- Data: ${new Date().toISOString()}`,
    `- Alvo: ${BASE_URL}`,
    `- PCs simulados: ${AGENTS}, enviando a cada ${INTERVAL_SECONDS} s`,
    `- Dashboards abertos: ${DASHBOARDS}, atualizando a cada ${DASHBOARD_REFRESH_SECONDS} s`,
    `- Duração: ${DURATION}`,
    `- Resultado: ${passed ? "APROVADO" : "REPROVADO"} (critério: p95 < 300 ms e falhas < 1%)`,
    "",
    "| Medida | Agentes | Dashboard |",
    "|---|---|---|",
    `| Mediana | ${ms(metricValue(m, agentsKey, "med"))} | ${ms(metricValue(m, dashboardKey, "med"))} |`,
    `| p95 | ${ms(metricValue(m, agentsKey, "p(95)"))} | ${ms(metricValue(m, dashboardKey, "p(95)"))} |`,
    `| p99 | ${ms(metricValue(m, agentsKey, "p(99)"))} | ${ms(metricValue(m, dashboardKey, "p(99)"))} |`,
    `| Máximo | ${ms(metricValue(m, agentsKey, "max"))} | ${ms(metricValue(m, dashboardKey, "max"))} |`,
    "",
    `- Requisições: ${metricValue(m, "http_reqs", "count") ?? 0} (${(metricValue(m, "http_reqs", "rate") ?? 0).toFixed(2)}/s)`,
    `- Falhas: ${failedRate === null ? "-" : `${(failedRate * 100).toFixed(2)}%`}`,
    `- Métricas enviadas: ${metricValue(m, "infraobserver_metrics_sent", "count") ?? 0}`,
    `- Eventos de arquivo enviados: ${metricValue(m, "infraobserver_file_events_sent", "count") ?? 0}`,
    `- Verificações: ${((metricValue(m, "checks", "rate") ?? 0) * 100).toFixed(2)}% ok`,
    "",
  ];
  const markdown = lines.join("\n");

  return {
    stdout: `\n${markdown}\n`,
    [`${RESULTS_DIR}/summary.md`]: markdown,
    [`${RESULTS_DIR}/summary.json`]: JSON.stringify(summary, null, 2),
  };
}
