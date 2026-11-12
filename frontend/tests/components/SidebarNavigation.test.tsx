import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import "@testing-library/jest-dom/vitest";

import { Users } from "lucide-react";
import { MemoryRouter } from "react-router";

import { SidebarNavigation } from "../../src/components/SidebarNavigation";
import { NAVIGATION_ITEMS, type NavigationItem } from "../../src/config/navigation";

// Item ainda não disponível, para testar o "Em breve".
const WITH_COMING_SOON: NavigationItem[] = [
  ...NAVIGATION_ITEMS,
  {
    label: "Usuários",
    icon: Users,
    comingSoonDescription: "Usuários dos clientes (em breve)",
  },
];

function renderSidebar(
  collapsed = false,
  items?: NavigationItem[],
  path = "/",
) {
  const onToggle = vi.fn();

  render(
    <MemoryRouter initialEntries={[path]}>
      <SidebarNavigation collapsed={collapsed} onToggle={onToggle} items={items} />
    </MemoryRouter>,
  );

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
      Clientes: "/clientes",
    };

    for (const [label, href] of Object.entries(expected)) {
      expect(
        within(nav).getByRole("link", { name: label }),
      ).toHaveAttribute("href", href);
    }
  });

  it("should link the sections back to the dashboard from another page", () => {
    const { nav } = renderSidebar(false, undefined, "/clientes");

    expect(within(nav).getByRole("link", { name: "Alertas" })).toHaveAttribute(
      "href",
      "/#alertas",
    );

    const clients = within(nav).getByRole("link", { name: "Clientes" });

    expect(clients).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Dashboard" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("should not mark Clientes on the dashboard", () => {
    const { nav } = renderSidebar();

    expect(within(nav).getByRole("link", { name: "Clientes" })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("should show an item without section as disabled and coming soon", () => {
    const { nav } = renderSidebar(false, WITH_COMING_SOON);

    expect(
      within(nav).queryByRole("link", { name: /Usuários/ }),
    ).not.toBeInTheDocument();

    const item = within(nav).getByText("Usuários").closest("[aria-disabled]");

    expect(item).toHaveAttribute("aria-disabled", "true");
    expect(item).toHaveAttribute("title", "Usuários dos clientes (em breve)");
    expect(within(nav).getByText("Em breve")).toBeInTheDocument();
  });

  it("should not show any coming soon item in the dashboard menu", () => {
    const { nav } = renderSidebar();

    expect(within(nav).queryByText("Em breve")).not.toBeInTheDocument();
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
    const { nav } = renderSidebar(true, WITH_COMING_SOON);

    expect(
      within(nav).getByRole("link", { name: "Métricas" }),
    ).toHaveAttribute("title", "Métricas");
    expect(within(nav).queryByText("Em breve")).not.toBeInTheDocument();
    expect(
      within(nav).getByLabelText("Usuários dos clientes (em breve)"),
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
