import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EndpointHealthSection } from "../../src/components/EndpointHealthSection";

describe("EndpointHealthSection", () => {
  it("shows the address, system and agent version of the endpoint", () => {
    render(
      <EndpointHealthSection
        endpoint={{
          id: 2,
          hostname: "DESKTOP-T0Q7Q50",
          status: "ONLINE",
          ipAddress: "192.168.0.15",
          osName: "Windows",
          osVersion: "11",
          agentVersion: "1.5.0",
        }}
        metric={null}
      />,
    );

    expect(
      screen.getByText("ID 2 · 192.168.0.15 · Windows 11 · Agente 1.5.0"),
    ).toBeTruthy();
  });

  it("omits what an older agent does not report", () => {
    render(
      <EndpointHealthSection
        endpoint={{ id: 1, hostname: "PC-ANTIGO", status: "OFFLINE", agentVersion: null }}
        metric={null}
      />,
    );

    expect(screen.getByText("ID 1")).toBeTruthy();
    expect(screen.getByText("Indisponível")).toBeTruthy();
  });

  it("asks to select an endpoint when none is selected", () => {
    render(<EndpointHealthSection endpoint={null} metric={null} />);

    expect(
      screen.getByText("Selecione um endpoint para visualizar seus detalhes."),
    ).toBeTruthy();
  });
});
