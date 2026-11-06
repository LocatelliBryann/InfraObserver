import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
} from "prom-client";

import { logger, type Logger } from "../config/logger";
import type { AlertService } from "../services/alert.service";
import type { EndpointHealthService } from "../services/endpoint-health.service";

// Registro único lido pelo Prometheus em GET /metrics.
export const metricsRegistry = new Registry();

// CPU, memória, event loop e garbage collector do processo Node.js.
collectDefaultMetrics({ register: metricsRegistry });

export interface HttpMetrics {
  requests: Counter<"method" | "route" | "status_code">;
  duration: Histogram<"method" | "route" | "status_code">;
}

export function createHttpMetrics(registry: Registry): HttpMetrics {
  return {
    requests: new Counter({
      name: "http_requests_total",
      help: "Total de requisições HTTP recebidas pela API",
      labelNames: ["method", "route", "status_code"],
      registers: [registry],
    }),
    duration: new Histogram({
      name: "http_request_duration_seconds",
      help: "Tempo de resposta das requisições HTTP, em segundos",
      labelNames: ["method", "route", "status_code"],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [registry],
    }),
  };
}

export const httpMetrics = createHttpMetrics(metricsRegistry);

export interface DomainMetricsSources {
  endpointHealth: Pick<EndpointHealthService, "findAll">;
  alerts: Pick<AlertService, "findActive">;
}

const ENDPOINT_STATUSES = ["ONLINE", "ALERT", "OFFLINE"] as const;

// Métricas do negócio, calculadas a partir do banco a cada coleta do Prometheus:
// quantos endpoints estão em cada status e quantos alertas estão abertos.
export function registerDomainMetrics(
  registry: Registry,
  sources: DomainMetricsSources,
  log: Logger = logger,
): { endpoints: Gauge<"status">; activeAlerts: Gauge<"metric_type" | "severity"> } {
  // Cada gauge faz a própria consulta no collect(): o prom-client lê os
  // gauges em paralelo, então um não pode depender do collect() do outro.
  const endpoints = new Gauge({
    name: "infraobserver_endpoints",
    help: "Endpoints monitorados por status (ONLINE, ALERT, OFFLINE)",
    labelNames: ["status"],
    registers: [registry],
    async collect() {
      this.reset();

      try {
        const health = await sources.endpointHealth.findAll();

        for (const status of ENDPOINT_STATUSES) {
          this.set(
            { status },
            health.filter((endpoint) => endpoint.status === status).length,
          );
        }
      } catch (error) {
        log.error({ err: error }, "Failed to collect endpoint metrics");
      }
    },
  });

  const activeAlerts = new Gauge({
    name: "infraobserver_alerts_active",
    help: "Alertas ativos por tipo de métrica e severidade",
    labelNames: ["metric_type", "severity"],
    registers: [registry],
    async collect() {
      this.reset();

      try {
        const alerts = await sources.alerts.findActive();

        for (const alert of alerts) {
          this.inc({
            metric_type: alert.metricType,
            severity: alert.severity,
          });
        }
      } catch (error) {
        log.error({ err: error }, "Failed to collect alert metrics");
      }
    },
  });

  return { endpoints, activeAlerts };
}
