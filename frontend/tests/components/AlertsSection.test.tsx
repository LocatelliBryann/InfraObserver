import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AlertsSection } from "../../src/components/AlertsSection";

import type { Endpoint } from "../../src/services/endpointsService";

const endpoints: Endpoint[] = [
  {
    id: "1",
    hostname: "server-01",
    ipAddress: "192.168.1.10",
    operatingSystem: "Linux",
    status: "ONLINE",
  },
];

const alerts = [
  {
    id: 1,
    endpointId: 1,
    metricId: 10,
    metricType: "CPU",
    thresholdValue: 80,
    severity: "HIGH",
    triggeredAt: "2026-09-19T18:00:00.000Z",
    resolvedAt: null,
  },
];

describe("AlertsSection", () => {
  it("exibe os alertas ativos", () => {
    render(
      <AlertsSection
        alerts={alerts}
        loading={false}
        error={null}
        endpoints={endpoints}
      />,
    );

    expect(screen.getByText("Alertas ativos")).toBeTruthy();
    expect(screen.getByText("CPU")).toBeTruthy();
    expect(screen.getByText("server-01")).toBeTruthy();
  });

  it("exibe mensagem durante o carregamento", () => {
    render(
      <AlertsSection
        alerts={[]}
        loading={true}
        error={null}
        endpoints={endpoints}
      />,
    );

    expect(
      screen.getByText("Carregando alertas..."),
    ).toBeTruthy();
  });

  it("exibe mensagem de erro", () => {
    render(
      <AlertsSection
        alerts={[]}
        loading={false}
        error="Erro na API"
        endpoints={endpoints}
      />,
    );

    expect(
      screen.getByText("Não foi possível carregar os alertas."),
    ).toBeTruthy();
  });

  it("exibe mensagem quando não existem alertas", () => {
    render(
      <AlertsSection
        alerts={[]}
        loading={false}
        error={null}
        endpoints={endpoints}
      />,
    );

    expect(
      screen.getByText("Nenhum alerta ativo no momento."),
    ).toBeTruthy();
  });

  it("exibe alerta mesmo quando o endpoint não é encontrado", () => {
    const alertWithoutEndpoint = [
      {
        ...alerts[0],
        endpointId: 999,
      },
    ];

    render(
      <AlertsSection
        alerts={alertWithoutEndpoint}
        loading={false}
        error={null}
        endpoints={endpoints}
      />,
    );

    expect(screen.getByText("CPU")).toBeTruthy();
  });

  it("exibe diferentes níveis de severidade", () => {
    const alertsWithSeverities = [
      ...alerts,
      {
        ...alerts[0],
        id: 2,
        severity: "CRITICAL",
      },
      {
        ...alerts[0],
        id: 3,
        severity: "MEDIUM",
      },
    ];

    render(
      <AlertsSection
        alerts={alertsWithSeverities}
        loading={false}
        error={null}
        endpoints={endpoints}
      />,
    );

    expect(screen.getByText("HIGH")).toBeTruthy();
    expect(screen.getByText("CRITICAL")).toBeTruthy();
    expect(screen.getByText("MEDIUM")).toBeTruthy();
  });

  it("alterna para o histórico de alertas resolvidos", async () => {
    render(
      <AlertsSection
        alerts={alerts}
        loading={false}
        error={null}
        endpoints={endpoints}
        history={[
          {
            id: 2,
            endpointId: 1,
            metricId: null,
            metricType: "OFFLINE",
            thresholdValue: 180,
            severity: "CRITICAL",
            triggeredAt: "2026-11-05T10:00:00.000Z",
            resolvedAt: "2026-11-05T11:30:00.000Z",
          },
        ]}
      />,
    );

    await userEvent.click(screen.getByRole("tab", { name: /Histórico/ }));

    expect(screen.getByText("Histórico de alertas")).toBeTruthy();
    expect(screen.getByText("Endpoint offline")).toBeTruthy();
    expect(screen.getByText("Limite: 180s sem dados")).toBeTruthy();
    expect(screen.getByText("Duração: 1 h 30 min")).toBeTruthy();
    expect(screen.getByText("1 resolvido(s)")).toBeTruthy();
  });

  it("não exibe as abas quando o histórico não é informado", () => {
    render(
      <AlertsSection
        alerts={alerts}
        loading={false}
        error={null}
        endpoints={endpoints}
      />,
    );

    expect(screen.queryByRole("tab")).toBeNull();
  });
});
