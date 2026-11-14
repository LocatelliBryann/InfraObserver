
import { render, screen } from "@testing-library/react";

import { describe, expect, it, vi } from "vitest";

import "@testing-library/jest-dom/vitest";

import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

import App from "../src/App";

const filters = vi.hoisted(() => ({ received: [] as unknown[] }));

vi.mock("../src/hooks/useEndpoints", () => ({
  useEndpoints: (clientFilter?: unknown) => {
    filters.received.push(clientFilter);

    return {
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
    };
  },
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

vi.mock("../src/hooks/useMonitoredDirectories", () => ({
  useMonitoredDirectories: () => ({
    directories: null,
    loading: false,
    error: null,
    save: vi.fn(),
  }),
}));

vi.mock("../src/hooks/useClients", () => ({
  describeClientError: () => "",
  useClients: () => ({
    clients: [{ id: 3, name: "Cliente Três", createdAt: "", endpointCount: 0, activeTokenCount: 0 }],
    loading: false,
    error: null,
    refresh: vi.fn(),
    createClient: vi.fn(),
  }),
}));

function renderApp(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe("App", () => {
  it("deve renderizar o dashboard", () => {
    renderApp();

    expect(
      screen.getByRole("heading", { name: "Visão geral" }),
    ).toBeInTheDocument();
  });

  it("deve exibir a quantidade de endpoints monitorados", () => {
    renderApp();

    expect(
      screen.getByText("Endpoints monitorados"),
    ).toBeInTheDocument();

    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("deve mostrar o filtro por cliente no dashboard", () => {
    renderApp();

    expect(screen.getByLabelText("Cliente")).toHaveValue("");
    expect(screen.queryByRole("button", { name: /Cliente Três/ })).not.toBeInTheDocument();
  });

  it("deve filtrar pelo cliente da URL e trocar o filtro pelo seletor", async () => {
    const user = userEvent.setup();
    renderApp("/?cliente=3");

    expect(screen.getByLabelText("Cliente")).toHaveValue("3");
    expect(filters.received[filters.received.length - 1]).toBe(3);

    await user.selectOptions(screen.getByLabelText("Cliente"), "Sem cliente");

    expect(filters.received[filters.received.length - 1]).toBe("none");

    await user.selectOptions(screen.getByLabelText("Cliente"), "Todos os clientes");

    expect(filters.received[filters.received.length - 1]).toBeUndefined();
  });

  it("deve abrir a página de clientes em /clientes", () => {
    renderApp("/clientes");

    expect(
      screen.getByRole("heading", { name: "Clientes" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cliente Três/ })).toBeInTheDocument();
    expect(screen.queryByLabelText("Cliente")).not.toBeInTheDocument();
    expect(filters.received[filters.received.length - 1]).toBeUndefined();
  });

  it("deve voltar ao dashboard numa rota desconhecida", () => {
    renderApp("/nao-existe");

    expect(
      screen.getByRole("heading", { name: "Visão geral" }),
    ).toBeInTheDocument();
  });
});