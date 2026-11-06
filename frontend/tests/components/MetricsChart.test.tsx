import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MetricsChart } from "../../src/components/MetricsChart";
import type { Metric } from "../../src/services/metricsService";

const metric: Metric = {
  id: 1,
  endpointId: 10,
  cpuPercent: 42.5,
  memoryUsed: 4 * 1024 * 1024 * 1024,
  memoryTotal: 8 * 1024 * 1024 * 1024,
  diskUsed: 100 * 1024 * 1024 * 1024,
  diskTotal: 500 * 1024 * 1024 * 1024,
  netBytesSent: "1000",
  netBytesRecv: "2000",
  collectedAt: "2026-11-05T12:00:00.000Z",
};

describe("MetricsChart", () => {
  it("uses the dark theme in the empty state", () => {
    render(<MetricsChart metrics={[]} />);

    const emptyState = screen.getByText("Nenhuma métrica disponível.");

    expect(emptyState.className).toContain("bg-slate-900");
    expect(emptyState.className).not.toContain("bg-white");
  });

  it("uses the dark theme when metrics are displayed", () => {
    render(<MetricsChart metrics={[metric]} />);

    const card = screen.getByTestId("metrics-chart");

    expect(card.className).toContain("bg-slate-900");
    expect(card.className).not.toContain("bg-white");
    expect(screen.getByText("Histórico de métricas")).toBeTruthy();
  });
});
