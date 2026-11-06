import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import "@testing-library/jest-dom/vitest";

import { AuthProvider } from "../../src/auth/AuthContext";
import { AuthGate } from "../../src/auth/AuthGate";
import { UserMenu } from "../../src/auth/UserMenu";
import { apiClient } from "../../src/services/apiClient";

const user = {
  id: 1,
  email: "admin@infraobserver.com.br",
  name: "Bryann Locatelli",
  role: "ADMIN",
};

type Route = { status: number; body?: unknown };

// Simula a API: cada caminho responde com o status configurado.
function mockApi(routes: Record<string, Route>) {
  const fetchMock = vi.fn(async (url: string) => {
    const path = new URL(url).pathname;
    const route = routes[path] ?? { status: 404 };

    return {
      ok: route.status >= 200 && route.status < 300,
      status: route.status,
      json: async () => route.body,
    };
  });

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

function renderApp() {
  return render(
    <AuthProvider>
      <AuthGate>
        <p>Dashboard protegido</p>
        <UserMenu collapsed={false} />
      </AuthGate>
    </AuthProvider>,
  );
}

describe("authentication flow", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should show the dashboard when a session already exists", async () => {
    mockApi({ "/api/v1/auth/me": { status: 200, body: { user } } });

    renderApp();

    expect(screen.getByRole("status")).toHaveTextContent("Verificando sessão");
    expect(await screen.findByText("Dashboard protegido")).toBeInTheDocument();
    expect(screen.getByText("Bryann Locatelli")).toBeInTheDocument();
    expect(screen.getByText("BL")).toBeInTheDocument();
  });

  it("should show the login page without a session and enter after login", async () => {
    mockApi({
      "/api/v1/auth/me": { status: 401 },
      "/api/v1/auth/login": { status: 200, body: { user } },
    });

    renderApp();

    expect(
      await screen.findByText("Acesso restrito ao administrador"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Dashboard protegido")).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("E-mail"), user.email);
    await userEvent.type(screen.getByLabelText("Senha"), "senha-correta-123");
    await userEvent.click(screen.getByRole("button", { name: /Entrar/ }));

    expect(await screen.findByText("Dashboard protegido")).toBeInTheDocument();
  });

  it("should return to the login page after logout", async () => {
    mockApi({
      "/api/v1/auth/me": { status: 200, body: { user } },
      "/api/v1/auth/logout": { status: 204 },
    });

    renderApp();

    await userEvent.click(await screen.findByRole("button", { name: "Sair" }));

    expect(
      await screen.findByText("Acesso restrito ao administrador"),
    ).toBeInTheDocument();
  });

  it("should return to the login page when the session expires", async () => {
    mockApi({
      "/api/v1/auth/me": { status: 200, body: { user } },
      "/api/v1/alerts": { status: 401 },
    });

    renderApp();
    await screen.findByText("Dashboard protegido");

    await act(async () => {
      await apiClient.get("/api/v1/alerts").catch(() => undefined);
    });

    expect(
      await screen.findByText("Acesso restrito ao administrador"),
    ).toBeInTheDocument();
  });

  it("should offer a retry when the API is unreachable", async () => {
    const fetchMock = mockApi({ "/api/v1/auth/me": { status: 500 } });

    renderApp();

    await userEvent.click(
      await screen.findByRole("button", { name: "Tentar novamente" }),
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("should not render the user menu outside the provider", () => {
    const { container } = render(<UserMenu collapsed />);

    expect(container).toBeEmptyDOMElement();
  });

  it("should require the provider for the gate", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => render(<AuthGate>conteúdo</AuthGate>)).toThrow(
      "AuthGate must be used inside AuthProvider",
    );
  });
});
