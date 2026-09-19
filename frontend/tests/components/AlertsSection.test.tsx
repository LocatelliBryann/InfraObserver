import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AlertsSection } from "../../src/components/AlertsSection";

const endpoints = [
  {
    id: 10,
    hostname: "servidor-01",
    ipAddress: "192.168.1.10",
    operatingSystem: "Linux",
    agentVersion: "1.0.0",
    status: "ONLINE",
  },
];

const alerts = [
  {
    id: 1,
    endpointId: 10,
    metricId: 20,
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
    expect(screen.getByText("servidor-01")).toBeTruthy();
    expect(screen.getByText("HIGH")).toBeTruthy();
    expect(screen.getByText("Limite: 80")).toBeTruthy();
  });

  it("exibe o estado de carregamento", () => {
    render(
      <AlertsSection
        alerts={[]}
        loading={true}
        error={null}
        endpoints={endpoints}
      />,
    );

    expect(screen.getByText("Carregando alertas...")).toBeTruthy();
  });

  it("exibe o estado de erro", () => {
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

  it("exibe mensagem quando não existem alertas ativos", () => {
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

  it("exibe identificador quando o endpoint não é encontrado", () => {
    render(
      <AlertsSection
        alerts={[
          {
            ...alerts[0],
            endpointId: 999,
          },
        ]}
        loading={false}
        error={null}
        endpoints={endpoints}
      />,
    );

    expect(screen.getByText("Endpoint #999")).toBeTruthy();
  });
});