
import { render, screen } from "@testing-library/react";

import { describe, expect, it, vi } from "vitest";

import "@testing-library/jest-dom/vitest";

import App from "../src/App";

vi.mock("../src/hooks/useEndpoints", () => ({
  useEndpoints: () => ({
    endpoints: [
      {
        id: 1,
        hostname: "DESKTOP-TEST",
        status: "ONLINE",
      },
      {
        id: 2,
        hostname: "SERVER-TEST",
        status: "OFFLINE",
      },
    ],
    loading: false,
    error: null,
  }),
}));

vi.mock("../src/hooks/useEndpointHealth", () => ({
  useEndpointHealth: () => ({
    health: [
      {
        endpointId: 1,
        latestMetric: null,
        isOnline: true,
        isStale: false,
      },
      {
        endpointId: 2,
        latestMetric: null,
        isOnline: false,
        isStale: true,
      },
    ],
    loading: false,
    error: null,
    onlineCount: 1,
    unavailableCount: 1,
    availability: 50,
  }),
}));

vi.mock("../src/hooks/useMetrics", () => ({
  useMetrics: () => ({
    metrics: [],
    loading: false,
    error: null,
  }),
}));

describe("App", () => {
  it("deve renderizar o dashboard", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Visão geral" }),
    ).toBeInTheDocument();
  });

  it("deve exibir a quantidade de endpoints monitorados", () => {
    render(<App />);

    expect(
      screen.getByText("Endpoints monitorados"),
    ).toBeInTheDocument();

    expect(screen.getByText("2")).toBeInTheDocument();
  });
});