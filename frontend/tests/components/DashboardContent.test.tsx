import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DashboardContent } from "../../src/components/DashboardContent";

import type { Alert } from "../../src/services/alertsService";
import type { Endpoint } from "../../src/services/endpointsService";
import type { FileEvent } from "../../src/services/fileEventsService";
import type { Metric } from "../../src/services/metricsService";

const endpoints: Endpoint[] = [
  {
    id: "1",
    hostname: "server-01",
    ipAddress: "192.168.1.10",
    operatingSystem: "Windows",
    status: "ONLINE",
  },
];

const defaultProps = {
  endpoints,
  loading: false,
  error: null,
  healthLoading: false,
  healthError: null,
  onlineCount: 1,
  availability: 100,
  selectedEndpoint: endpoints[0],
  selectedEndpointHealth: {
    isOnline: true,
  },
  activeEndpointId: 1,
  setSelectedEndpointId: () => {},
  metrics: [] as Metric[],
  metricsLoading: false,
  metricsError: null,
  latestMetric: null,
  alerts: [] as Alert[],
  alertsLoading: false,
  alertsError: null,
  fileEvents: [] as FileEvent[],
  fileEventsLoading: false,
  fileEventsError: null,
};

describe("DashboardContent", () => {
  it("exibe a quantidade de endpoints monitorados", () => {
    render(<DashboardContent {...defaultProps} />);

    expect(
      screen.getByText("Endpoints monitorados"),
    ).toBeTruthy();

    expect(
      screen.getByText("1 endpoint(s) registrado(s)"),
    ).toBeTruthy();
  });

  it("exibe estado vazio quando não existem métricas", () => {
    render(<DashboardContent {...defaultProps} />);

    expect(
      screen.getAllByText("Nenhuma métrica disponível").length,
    ).toBeGreaterThan(0);
  });

  it("exibe estado vazio quando não existem atividades recentes", () => {
    render(<DashboardContent {...defaultProps} />);

    expect(
      screen.getByText(/Nenhuma atividade/),
    ).toBeTruthy();
  });

  it("exibe mensagem quando não existem alertas ativos", () => {
    render(<DashboardContent {...defaultProps} />);

    expect(
      screen.getByText("Nenhum alerta ativo"),
    ).toBeTruthy();
  });

  it("exibe estado de carregamento das métricas", () => {
    render(
      <DashboardContent
        {...defaultProps}
        metricsLoading
      />,
    );

    expect(
      screen.getByText("Carregando métricas..."),
    ).toBeTruthy();
  });

  it("exibe mensagem de erro ao carregar métricas", () => {
    render(
      <DashboardContent
        {...defaultProps}
        metricsError="Erro na API"
      />,
    );

    expect(
      screen.getByText("Não foi possível carregar as métricas."),
    ).toBeTruthy();
  });
});