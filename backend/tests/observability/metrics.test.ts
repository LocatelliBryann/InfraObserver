import { Registry } from "prom-client";
import { describe, expect, it, vi } from "vitest";

import { registerDomainMetrics } from "../../src/observability/metrics";

function createLog() {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

describe("registerDomainMetrics", () => {
  it("should expose endpoints by status and active alerts", async () => {
    const registry = new Registry();
    const sources = {
      endpointHealth: {
        findAll: vi.fn().mockResolvedValue([
          { status: "ONLINE" },
          { status: "ONLINE" },
          { status: "ALERT" },
        ]),
      },
      alerts: {
        findActive: vi.fn().mockResolvedValue([
          { metricType: "CPU", severity: "HIGH" },
          { metricType: "CPU", severity: "HIGH" },
          { metricType: "OFFLINE", severity: "CRITICAL" },
        ]),
      },
    };

    registerDomainMetrics(registry, sources as never, createLog());
    const output = await registry.metrics();

    expect(output).toContain('infraobserver_endpoints{status="ONLINE"} 2');
    expect(output).toContain('infraobserver_endpoints{status="ALERT"} 1');
    expect(output).toContain('infraobserver_endpoints{status="OFFLINE"} 0');
    expect(output).toContain(
      'infraobserver_alerts_active{metric_type="CPU",severity="HIGH"} 2',
    );
    expect(output).toContain(
      'infraobserver_alerts_active{metric_type="OFFLINE",severity="CRITICAL"} 1',
    );
  });

  it("should reflect the current state on every scrape", async () => {
    const registry = new Registry();
    const findActive = vi
      .fn()
      .mockResolvedValueOnce([{ metricType: "DISK", severity: "CRITICAL" }])
      .mockResolvedValueOnce([]);

    registerDomainMetrics(
      registry,
      {
        endpointHealth: { findAll: vi.fn().mockResolvedValue([]) },
        alerts: { findActive },
      } as never,
      createLog(),
    );

    expect(await registry.metrics()).toContain(
      'infraobserver_alerts_active{metric_type="DISK",severity="CRITICAL"} 1',
    );
    expect(await registry.metrics()).not.toContain('metric_type="DISK"');
  });

  it("should log and keep serving metrics when the database fails", async () => {
    const registry = new Registry();
    const log = createLog();

    registerDomainMetrics(
      registry,
      {
        endpointHealth: {
          findAll: vi.fn().mockRejectedValue(new Error("db down")),
        },
        alerts: {
          findActive: vi.fn().mockRejectedValue(new Error("db down")),
        },
      } as never,
      log,
    );

    const output = await registry.metrics();

    expect(output).toContain("# TYPE infraobserver_endpoints gauge");
    expect(output).not.toContain('infraobserver_endpoints{status="ONLINE"}');
    expect(log.error).toHaveBeenCalledTimes(2);
  });
});
