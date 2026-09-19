
import { fireEvent, render, screen } from "@testing-library/react";

import { describe, expect, it, vi } from "vitest";

import "@testing-library/jest-dom/vitest";

import App from "../src/App";

vi.mock("../src/hooks/useEndpoints", () => ({
  useEndpoints: () => ({
    endpoints: [
      {
        id: "1",
        hostname: "DESKTOP-TEST",
        status: "ONLINE",
      },
      {
        id: "2",
        hostname: "SERVER-TEST",
        status: "OFFLINE",
      },
    ],
    loading: false,
    error: null,
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

    expect(screen.getByText("Endpoints monitorados")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("deve permitir selecionar outro endpoint para visualizar métricas", () => {
    render(<App />);

    const endpointSelect = screen.getByRole("combobox");

    expect(endpointSelect).toHaveValue("1");

    fireEvent.change(endpointSelect, {
      target: { value: "2" },
    });

    expect(endpointSelect).toHaveValue("2");
  });
});