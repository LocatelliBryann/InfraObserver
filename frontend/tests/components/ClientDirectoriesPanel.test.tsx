import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ClientDirectoriesPanel } from "../../src/components/ClientDirectoriesPanel";
import type { Client } from "../../src/services/clientsService";
import {
  monitoredDirectoriesService,
  type ClientDirectories,
} from "../../src/services/monitoredDirectoriesService";

vi.mock("../../src/services/monitoredDirectoriesService", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../../src/services/monitoredDirectoriesService")>();

  return {
    ...original,
    monitoredDirectoriesService: {
      getClient: vi.fn(),
      saveClient: vi.fn(),
    },
  };
});

const client = {
  id: 3,
  name: "1RIJOINVILLE",
  createdAt: "2026-11-10T12:00:00.000Z",
  endpointCount: 45,
  activeTokenCount: 1,
} as Client;

function clientDirectories(overrides: Partial<ClientDirectories> = {}): ClientDirectories {
  return {
    clientId: 3,
    mode: "installation",
    directories: [],
    configuredAt: null,
    customEndpointCount: 0,
    ...overrides,
  };
}

describe("ClientDirectoriesPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(monitoredDirectoriesService.getClient).mockResolvedValue(clientDirectories());
  });

  it("deve mostrar que cada PC usa as pastas da instalação", async () => {
    render(<ClientDirectoriesPanel client={client} />);

    expect(
      await screen.findByText("Cada PC monitora as pastas definidas na instalação do agente."),
    ).toBeInTheDocument();
    expect(monitoredDirectoriesService.getClient).toHaveBeenCalledWith(3);
  });

  it("deve mostrar a lista do cliente e os PCs com lista própria", async () => {
    vi.mocked(monitoredDirectoriesService.getClient).mockResolvedValue(
      clientDirectories({
        mode: "custom",
        directories: ["D:\\Compartilhado"],
        customEndpointCount: 1,
      }),
    );

    render(<ClientDirectoriesPanel client={client} />);

    const list = await screen.findByRole("list", { name: "Pastas do cliente 1RIJOINVILLE" });
    expect(within(list).getByText("D:\\Compartilhado")).toBeInTheDocument();
    expect(
      screen.getByText("1 PC deste cliente tem lista própria e não segue esta configuração."),
    ).toBeInTheDocument();
  });

  it("deve configurar todos os PCs para não monitorar pastas", async () => {
    // Cartório: as estações só enviam métricas; o servidor de arquivos tem lista própria.
    const user = userEvent.setup();
    vi.mocked(monitoredDirectoriesService.saveClient).mockResolvedValue(
      clientDirectories({ mode: "custom", customEndpointCount: 2 }),
    );

    render(<ClientDirectoriesPanel client={client} />);

    await user.click(await screen.findByRole("button", { name: "Editar pastas do cliente" }));
    await user.click(screen.getByRole("radio", { name: "Mesma lista para todos os PCs" }));
    expect(
      screen.getByText("Lista vazia: os PCs não monitoram pastas, só enviam métricas."),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Salvar para o cliente" }));

    expect(monitoredDirectoriesService.saveClient).toHaveBeenCalledWith(3, {
      mode: "custom",
      directories: [],
    });
    expect(
      await screen.findByText("Nenhuma pasta: os PCs só enviam métricas."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("2 PCs deste cliente têm lista própria e não seguem esta configuração."),
    ).toBeInTheDocument();
  });

  it("deve salvar uma lista para todos os PCs", async () => {
    const user = userEvent.setup();
    vi.mocked(monitoredDirectoriesService.saveClient).mockResolvedValue(
      clientDirectories({ mode: "custom", directories: ["C:\\Digitalizacao"] }),
    );

    render(<ClientDirectoriesPanel client={client} />);

    await user.click(await screen.findByRole("button", { name: "Editar pastas do cliente" }));
    await user.click(screen.getByRole("radio", { name: "Mesma lista para todos os PCs" }));
    await user.type(screen.getByLabelText("Caminho da pasta"), "C:\\Digitalizacao");
    await user.click(screen.getByRole("button", { name: "Adicionar" }));
    await user.click(screen.getByRole("button", { name: "Salvar para o cliente" }));

    expect(monitoredDirectoriesService.saveClient).toHaveBeenCalledWith(3, {
      mode: "custom",
      directories: ["C:\\Digitalizacao"],
    });
  });

  it("deve voltar para as pastas da instalação", async () => {
    const user = userEvent.setup();
    vi.mocked(monitoredDirectoriesService.getClient).mockResolvedValue(
      clientDirectories({ mode: "custom", directories: ["C:\\x"] }),
    );
    vi.mocked(monitoredDirectoriesService.saveClient).mockResolvedValue(clientDirectories());

    render(<ClientDirectoriesPanel client={client} />);

    await user.click(await screen.findByRole("button", { name: "Editar pastas do cliente" }));
    await user.click(screen.getByRole("radio", { name: "Pastas da instalação de cada PC" }));
    await user.click(screen.getByRole("button", { name: "Salvar para o cliente" }));

    expect(monitoredDirectoriesService.saveClient).toHaveBeenCalledWith(3, {
      mode: "installation",
      directories: [],
    });
  });

  it("deve mostrar os erros de leitura e de gravação", async () => {
    const user = userEvent.setup();
    vi.mocked(monitoredDirectoriesService.saveClient).mockRejectedValue(new Error("400"));

    render(<ClientDirectoriesPanel client={client} />);

    await user.click(await screen.findByRole("button", { name: "Editar pastas do cliente" }));
    await user.click(screen.getByRole("button", { name: "Salvar para o cliente" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível salvar as pastas.",
    );

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("deve avisar quando não consegue carregar", async () => {
    vi.mocked(monitoredDirectoriesService.getClient).mockRejectedValue(new Error("offline"));

    render(<ClientDirectoriesPanel client={client} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível carregar as pastas do cliente.",
    );
  });
});
