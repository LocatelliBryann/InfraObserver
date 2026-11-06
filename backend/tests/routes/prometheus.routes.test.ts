import request from "supertest";
import { describe, expect, it } from "vitest";

import app from "../../src/app";

describe("GET /metrics", () => {
  it("should expose application metrics for Prometheus", async () => {
    await request(app).get("/health");

    const response = await request(app).get("/metrics");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/plain");
    expect(response.text).toContain("# TYPE http_requests_total counter");
    expect(response.text).toContain('route="/health"');
    expect(response.text).toContain("process_cpu_seconds_total");
    expect(response.text).toContain("nodejs_eventloop_lag_seconds");
    expect(response.text).toContain("# TYPE infraobserver_endpoints gauge");
  });
});
