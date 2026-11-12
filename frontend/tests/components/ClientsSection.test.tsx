import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import "@testing-library/jest-dom/vitest";

import {
  ClientsSection,
  silentInstallCommand,
} from "../../src/components/ClientsSection";
import { ApiError } from "../../src/services/apiClient";
import { clientsService } from "../../src/services/clientsService";

vi.mock("../../src/services/clientsService", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../../src/services/clientsService")>();

  return {
    ...original,
    clientsService: {
      getEnrollmentTokens: vi.fn(),
      createEnrollmentToken: vi.fn(),
      revokeEnrollmentToken: vi.fn(),
    },
  };
});

const clients = [
  {
    id: 1,
    name: "Contabilidade Silva",
    createdAt: "2026-11-01T12:00:00Z",
    endpointCount: 3,
    activeTokenCount: 1,
  },
  {
    id: 2,
    name: "Escritório Souza",
    createdAt: "2026-11-02T12:00:00Z",
    endpointCount: 1,
    activeTokenCount: 0,
  },
];

const activeToken = {
  id: 10,
  clientId: 1,
  prefix: "ioe_AbCdEfGh",
  createdAt: "2026-11-05T12:00:00Z",
  expiresAt: null,
  revokedAt: null,
  lastUsedAt: "2026-11-06T12:00:00Z",
  usageCount: 3,
};

const revokedToken = {
  ...activeToken,
  id: 9,
  prefix: "ioe_Antigo12",
  revokedAt: "2026-11-04T12:00:00Z",
  usageCount: 1,
};

function renderSection(overrides: Partial<Parameters<typeof ClientsSection>[0]> = {}) {
  const props = {
    clients,
    loading: false,
    error: null,
    onCreateClient: vi.fn().mockResolvedValue({ ...clients[1], id: 3, name: "Novo" }),
    onChanged: vi.fn(),
    ...overrides,
  };

  render(<ClientsSection {...props} />);

  return props;
}

describe("ClientsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(clientsService.getEnrollmentTokens).mockResolvedValue([
      activeToken,
      revokedToken,
    ]);
  });

  it("lista os clientes e os tokens do primeiro", async () => {
    renderSection();

    expect(screen.getByText("3 PCs · 1 token ativo")).toBeInTheDocument();
    expect(screen.getByText("1 PC · 0 tokens ativos")).toBeInTheDocument();

    const tokens = await screen.findByRole("list", { name: "Tokens de instalação" });

    expect(within(tokens).getByText("ioe_AbCdEfGh…")).toBeInTheDocument();
    expect(within(tokens).getByText("Ativo")).toBeInTheDocument();
    expect(within(tokens).getByText("Revogado")).toBeInTheDocument();
    expect(within(tokens).getByText(/3 instalações · sem validade/)).toBeInTheDocument();
    expect(clientsService.getEnrollmentTokens).toHaveBeenCalledWith(1);
  });

  it("troca de cliente", async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole("button", { name: /Escritório Souza/ }));

    await waitFor(() =>
      expect(clientsService.getEnrollmentTokens).toHaveBeenLastCalledWith(2),
    );
    expect(screen.getByRole("button", { name: /Escritório Souza/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("cadastra um cliente", async () => {
    const user = userEvent.setup();
    const props = renderSection();

    await user.type(screen.getByLabelText("Nome do cliente"), "  Novo  ");
    await user.click(screen.getByRole("button", { name: "Adicionar" }));

    expect(props.onCreateClient).toHaveBeenCalledWith("Novo");
    expect(screen.getByLabelText("Nome do cliente")).toHaveValue("");
  });

  it("valida o nome e mostra o erro da API", async () => {
    const user = userEvent.setup();
    const props = renderSection({
      onCreateClient: vi.fn().mockRejectedValue(new ApiError(409)),
    });

    await user.type(screen.getByLabelText("Nome do cliente"), "A");
    await user.click(screen.getByRole("button", { name: "Adicionar" }));

    expect(screen.getByRole("alert")).toHaveTextContent("entre 2 e 100");
    expect(props.onCreateClient).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Nome do cliente"), "BC");
    await user.click(screen.getByRole("button", { name: "Adicionar" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Já existe um cliente com esse nome.",
    );
  });

  it("gera um token e mostra o valor completo uma vez", async () => {
    const user = userEvent.setup();
    const token = "ioe_TokenCompletoGeradoAgora";
    vi.mocked(clientsService.createEnrollmentToken).mockResolvedValue({
      token,
      enrollmentToken: { ...activeToken, id: 11 },
    });
    const props = renderSection();

    await screen.findByRole("list", { name: "Tokens de instalação" });
    await user.selectOptions(screen.getByLabelText("Validade"), "30 dias");
    await user.click(screen.getByRole("button", { name: "Gerar token" }));

    expect(clientsService.createEnrollmentToken).toHaveBeenCalledWith(1, 30);

    const notice = await screen.findByRole("status");

    expect(within(notice).getByText(token)).toBeInTheDocument();
    expect(within(notice).getByText(/\/VERYSILENT \/SERVER=.+ \/TOKEN=ioe_TokenCompleto/)).toBeInTheDocument();
    expect(notice).toHaveTextContent("não será mostrado de novo");
    expect(props.onChanged).toHaveBeenCalled();
  });

  it("copia o token", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    vi.mocked(clientsService.createEnrollmentToken).mockResolvedValue({
      token: "ioe_ParaCopiar",
      enrollmentToken: activeToken,
    });
    renderSection();

    await user.click(await screen.findByRole("button", { name: "Gerar token" }));
    await user.click(
      await screen.findByRole("button", { name: "Copiar: Token de instalação" }),
    );

    expect(writeText).toHaveBeenCalledWith("ioe_ParaCopiar");
    expect(await screen.findByText("Copiado")).toBeInTheDocument();
  });

  it("revoga um token em dois passos", async () => {
    const user = userEvent.setup();
    vi.mocked(clientsService.revokeEnrollmentToken).mockResolvedValue({
      ...activeToken,
      revokedAt: "2026-11-10T12:00:00Z",
    });
    const props = renderSection();

    await user.click(
      await screen.findByRole("button", { name: "Revogar o token ioe_AbCdEfGh" }),
    );

    expect(clientsService.revokeEnrollmentToken).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Confirmar revogação" }));

    expect(clientsService.revokeEnrollmentToken).toHaveBeenCalledWith(1, 10);
    await waitFor(() => expect(props.onChanged).toHaveBeenCalled());
  });

  it("não oferece revogar um token já revogado", async () => {
    renderSection();

    await screen.findByRole("list", { name: "Tokens de instalação" });

    expect(
      screen.queryByRole("button", { name: "Revogar o token ioe_Antigo12" }),
    ).not.toBeInTheDocument();
  });

  it("mostra o estado vazio, o carregamento e o erro", () => {
    const { unmount } = render(
      <ClientsSection clients={[]} loading={false} error={null} onCreateClient={vi.fn()} onChanged={vi.fn()} />,
    );

    expect(screen.getByText("Nenhum cliente cadastrado")).toBeInTheDocument();
    unmount();

    render(
      <ClientsSection clients={[]} loading={false} error="Não foi possível carregar os clientes." onCreateClient={vi.fn()} onChanged={vi.fn()} />,
    );

    expect(screen.getByText("Não foi possível carregar os clientes.")).toBeInTheDocument();
  });

  it("mostra o erro ao carregar os tokens", async () => {
    vi.mocked(clientsService.getEnrollmentTokens).mockRejectedValue(new Error("falhou"));
    renderSection();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar os tokens.",
    );
  });
});

describe("silentInstallCommand", () => {
  it("monta o comando do instalador", () => {
    expect(silentInstallCommand("https://infraobserver.com.br", "ioe_x")).toBe(
      "InfraObserverAgentSetup.exe /VERYSILENT /SERVER=https://infraobserver.com.br /TOKEN=ioe_x",
    );
  });
});
