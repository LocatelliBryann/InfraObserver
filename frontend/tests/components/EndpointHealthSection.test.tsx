import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

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

describe("EndpointHealthSection access", () => {
  it("shows the client of the endpoint", () => {
    render(
      <EndpointHealthSection
        endpoint={{ id: 3, hostname: "PC-RECEPCAO", status: "ONLINE", clientName: "Contabilidade Silva" }}
        metric={null}
      />,
    );

    expect(screen.getByText("ID 3 · Cliente Contabilidade Silva")).toBeTruthy();
  });

  it("revokes the access in two steps", async () => {
    const user = userEvent.setup();
    const onRevoke = vi.fn().mockResolvedValue(undefined);

    render(
      <EndpointHealthSection
        endpoint={{ id: 3, hostname: "PC-RECEPCAO", status: "ONLINE" }}
        metric={null}
        onRevoke={onRevoke}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Revogar acesso" }));

    expect(onRevoke).not.toHaveBeenCalled();
    expect(screen.getByText(/O agente de PC-RECEPCAO para de enviar dados/)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Confirmar revogação" }));

    expect(onRevoke).toHaveBeenCalledWith(3);
  });

  it("can cancel and shows an error when the revocation fails", async () => {
    const user = userEvent.setup();
    const onRevoke = vi.fn().mockRejectedValue(new Error("falhou"));

    render(
      <EndpointHealthSection
        endpoint={{ id: 3, hostname: "PC-RECEPCAO", status: "ONLINE" }}
        metric={null}
        onRevoke={onRevoke}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Revogar acesso" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.getByRole("button", { name: "Revogar acesso" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Revogar acesso" }));
    await user.click(screen.getByRole("button", { name: "Confirmar revogação" }));

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Não foi possível revogar o acesso.",
    );
  });

  it("shows when the access was revoked instead of the button", () => {
    render(
      <EndpointHealthSection
        endpoint={{ id: 3, hostname: "PC-RECEPCAO", status: "OFFLINE", revokedAt: "2026-11-10T12:00:00Z" }}
        metric={null}
        onRevoke={vi.fn()}
      />,
    );

    expect(screen.getByText(/Acesso revogado em 10\/11\/2026/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Revogar acesso" })).toBeNull();
  });

  it("hides the button without the revoke action", () => {
    render(
      <EndpointHealthSection endpoint={{ id: 3, hostname: "PC", status: "ONLINE" }} metric={null} />,
    );

    expect(screen.queryByRole("button", { name: "Revogar acesso" })).toBeNull();
  });
});
