import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EndpointStatusList } from "../../src/components/EndpointStatusList";
import type { EndpointHealth } from "../../src/services/endpointHealthService";

function health(
  endpointId: number,
  hostname: string,
  status: EndpointHealth["status"],
  activeAlerts = 0,
): EndpointHealth {
  return {
    endpointId,
    hostname,
    status,
    activeAlerts,
    isOnline: status !== "OFFLINE",
    isStale: status === "OFFLINE",
    latestMetric: null,
  };
}

describe("EndpointStatusList", () => {
  it("exibe o status de cada endpoint", () => {
    render(
      <EndpointStatusList
        health={[
          health(1, "PC-ONLINE", "ONLINE"),
          health(2, "PC-ALERTA", "ALERT", 2),
          health(3, "PC-OFFLINE", "OFFLINE"),
        ]}
        activeEndpointId={1}
        onSelect={() => {}}
      />,
    );

    expect(screen.getByText("Online")).toBeInTheDocument();
    expect(screen.getByText("Alerta · 2")).toBeInTheDocument();
    expect(screen.getByText("Offline")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /PC-ONLINE/ }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("seleciona o endpoint ao clicar", async () => {
    const onSelect = vi.fn();

    render(
      <EndpointStatusList
        health={[health(7, "PC-007", "ONLINE")]}
        activeEndpointId={null}
        onSelect={onSelect}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /PC-007/ }));

    expect(onSelect).toHaveBeenCalledWith(7);
  });

  it("não renderiza nada sem endpoints", () => {
    const { container } = render(
      <EndpointStatusList
        health={[]}
        activeEndpointId={null}
        onSelect={() => {}}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
