import express from "express";
import { Registry } from "prom-client";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createHttpMetricsMiddleware } from "../../src/middlewares/http-metrics.middleware";
import { createHttpMetrics } from "../../src/observability/metrics";

function createApp() {
  const registry = new Registry();
  const app = express();
  const router = express.Router();

  router.get("/", (_req, res) => {
    res.json([]);
  });
  router.get("/:id", (_req, res) => {
    res.status(404).json({});
  });

  app.use(createHttpMetricsMiddleware(createHttpMetrics(registry)));
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.use("/api/v1/alerts", router);

  return { app, registry };
}

describe("http metrics middleware", () => {
  it("should count requests by route pattern and status", async () => {
    const { app, registry } = createApp();

    await request(app).get("/health");
    await request(app).get("/api/v1/alerts");
    await request(app).get("/api/v1/alerts/42");
    await request(app).get("/api/v1/alerts/43");

    const output = await registry.metrics();

    expect(output).toContain(
      'http_requests_total{method="GET",route="/health",status_code="200"} 1',
    );
    expect(output).toContain(
      'http_requests_total{method="GET",route="/api/v1/alerts",status_code="200"} 1',
    );
    expect(output).toContain(
      'http_requests_total{method="GET",route="/api/v1/alerts/:id",status_code="404"} 2',
    );
    expect(output).not.toContain("/api/v1/alerts/42");
  });

  it("should group unknown routes under a single label", async () => {
    const { app, registry } = createApp();

    await request(app).get("/wp-admin");
    await request(app).get("/qualquer/coisa");

    const output = await registry.metrics();

    expect(output).toContain(
      'http_requests_total{method="GET",route="unmatched",status_code="404"} 2',
    );
  });

  it("should record the response time", async () => {
    const { app, registry } = createApp();

    await request(app).get("/health");

    const output = await registry.metrics();

    expect(output).toContain(
      'http_request_duration_seconds_count{method="GET",route="/health",status_code="200"} 1',
    );
  });
});
