import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import "@testing-library/jest-dom/vitest";

import { SidebarNavigation } from "../../src/components/SidebarNavigation";

function renderSidebar(collapsed = false) {
  const onToggle = vi.fn();

  render(<SidebarNavigation collapsed={collapsed} onToggle={onToggle} />);

  return {
    onToggle,
    nav: screen.getByRole("navigation", { name: "Navegação principal" }),
  };
}

describe("SidebarNavigation", () => {
  afterEach(() => {
    globalThis.location.hash = "";
  });

  it("should link each available item to its dashboard section", () => {
    const { nav } = renderSidebar();

    const expected = {
      Dashboard: "#visao-geral",
      Alertas: "#alertas",
      Métricas: "#metricas",
      Endpoints: "#endpoints",
      Eventos: "#eventos",
    };

    for (const [label, href] of Object.entries(expected)) {
      expect(
        within(nav).getByRole("link", { name: label }),
      ).toHaveAttribute("href", href);
    }
  });

  it("should show Clientes as disabled and coming soon", () => {
    const { nav } = renderSidebar();

    expect(
      within(nav).queryByRole("link", { name: /Clientes/ }),
    ).not.toBeInTheDocument();

    const clientes = within(nav).getByText("Clientes").closest(
      "[aria-disabled]",
    );

    expect(clientes).toHaveAttribute("aria-disabled", "true");
    expect(clientes).toHaveAttribute(
      "title",
      "Cadastro de clientes e usuários (em breve)",
    );
    expect(within(nav).getByText("Em breve")).toBeInTheDocument();
  });

  it("should mark Dashboard as the current section by default", () => {
    const { nav } = renderSidebar();

    expect(
      within(nav).getByRole("link", { name: "Dashboard" }),
    ).toHaveAttribute("aria-current", "location");
  });

  it("should mark the clicked item as the current section", () => {
    const { nav } = renderSidebar();

    fireEvent.click(within(nav).getByRole("link", { name: "Alertas" }));

    expect(
      within(nav).getByRole("link", { name: "Alertas" }),
    ).toHaveAttribute("aria-current", "location");
    expect(
      within(nav).getByRole("link", { name: "Dashboard" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("should keep links accessible by name when collapsed", () => {
    const { nav } = renderSidebar(true);

    expect(
      within(nav).getByRole("link", { name: "Métricas" }),
    ).toHaveAttribute("title", "Métricas");
    expect(within(nav).queryByText("Em breve")).not.toBeInTheDocument();
    expect(
      within(nav).getByLabelText("Cadastro de clientes e usuários (em breve)"),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("should toggle the sidebar", () => {
    const { onToggle } = renderSidebar();

    const toggle = screen.getByRole("button", {
      name: "Minimizar menu lateral",
    });

    expect(toggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(toggle);

    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
