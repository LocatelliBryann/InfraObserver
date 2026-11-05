
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EndpointResourceSummary } from "../../src/components/EndpointResourceSummary";

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
});