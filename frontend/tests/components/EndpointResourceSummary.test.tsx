
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  EndpointResourceSummary,
  usageLevel,
  USAGE_THRESHOLDS,
} from "../../src/components/EndpointResourceSummary";
import type { Metric } from "../../src/services/metricsService";

const GB = 1024 * 1024 * 1024;

function metric(overrides: Partial<Metric> = {}): Metric {
  return {
    id: 1,
    endpointId: 10,
    cpuPercent: 12,
    memoryUsed: 4 * GB,
    memoryTotal: 8 * GB,
    diskUsed: 50 * GB,
    diskTotal: 100 * GB,
    netBytesSent: "2048",
    netBytesRecv: "4096",
    collectedAt: "2026-09-19T10:00:00.000Z",
    ...overrides,
  };
}

describe("EndpointResourceSummary", () => {
  it("displays an empty state when no metric is available", () => {
    render(<EndpointResourceSummary metric={null} />);

    expect(
      screen.getByText("Nenhuma métrica disponível"),
    ).toBeTruthy();

    expect(
      screen.getByText(
        "O endpoint ainda não enviou dados de monitoramento.",
      ),
    ).toBeTruthy();
  });

  it("displays metric resource values", () => {
    render(
      <EndpointResourceSummary
        metric={{
          id: 1,
          endpointId: 10,
          cpuPercent: 42.5,
          memoryUsed: 4 * 1024 * 1024 * 1024,
          memoryTotal: 8 * 1024 * 1024 * 1024,
          diskUsed: 50 * 1024 * 1024 * 1024,
          diskTotal: 100 * 1024 * 1024 * 1024,
          netBytesSent: "2048",
          netBytesRecv: "4096",
          collectedAt: "2026-09-19T10:00:00.000Z",
        }}
      />,
    );

    expect(screen.getByText("42.5%")).toBeTruthy();
    expect(screen.getAllByText("50.0%").length).toBeGreaterThan(0);
    expect(screen.getByText("2.0 KB")).toBeTruthy();
    expect(screen.getByText("4.0 KB")).toBeTruthy();
  });

  it("shows a bar for processor, memory and storage", () => {
    render(<EndpointResourceSummary metric={metric({ cpuPercent: 42.5 })} />);

    const bars = screen.getAllByRole("progressbar");

    expect(bars.map((bar) => bar.getAttribute("aria-label"))).toEqual([
      "Processador em uso",
      "Memória em uso",
      "Armazenamento em uso",
    ]);
    expect(bars.map((bar) => bar.getAttribute("aria-valuenow"))).toEqual([
      "43",
      "50",
      "50",
    ]);
  });

  it("shows how much storage is used out of the total", () => {
    render(
      <EndpointResourceSummary
        metric={metric({ diskUsed: 179.2 * GB, diskTotal: 238.5 * GB })}
      />,
    );

    expect(screen.getByText(/179\.2 GB de 238\.5 GB/)).toBeTruthy();
  });

  it("colors the bars with the alert limits", () => {
    render(
      <EndpointResourceSummary
        metric={metric({
          cpuPercent: 85,
          memoryUsed: 7.5 * GB,
          memoryTotal: 10 * GB,
          diskUsed: 85 * GB,
          diskTotal: 100 * GB,
        })}
      />,
    );

    const [cpu, memory, disk] = screen.getAllByRole("progressbar");

    expect(cpu.getAttribute("data-level")).toBe("critical");
    expect(memory.getAttribute("data-level")).toBe("warning");
    expect(disk.getAttribute("data-level")).toBe("warning");
  });

  it("shows no bar when a value is missing", () => {
    render(
      <EndpointResourceSummary
        metric={metric({ cpuPercent: null, diskTotal: null })}
      />,
    );

    expect(screen.getAllByRole("progressbar")).toHaveLength(1);
    expect(screen.getAllByText("Sem dados")).toHaveLength(2);
  });

  it("uses the same limits as the backend alerts", () => {
    expect(usageLevel(80, USAGE_THRESHOLDS.cpu)).toBe("warning");
    expect(usageLevel(80.1, USAGE_THRESHOLDS.cpu)).toBe("critical");
    expect(usageLevel(90, USAGE_THRESHOLDS.disk)).toBe("warning");
    expect(usageLevel(90.1, USAGE_THRESHOLDS.disk)).toBe("critical");
    expect(usageLevel(70, USAGE_THRESHOLDS.memory)).toBe("ok");
  });
});
