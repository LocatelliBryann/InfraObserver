import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MonitoredDirectoriesPanel } from "../../src/components/MonitoredDirectoriesPanel";
import type { MonitoredDirectories } from "../../src/services/monitoredDirectoriesService";

const CLIENT = { id: 3, name: "1RIJOINVILLE", mode: "installation" as const };

function directories(overrides: Partial<MonitoredDirectories> = {}): MonitoredDirectories {
  return {
    endpointId: 7,
    mode: "inherit",
    configuredDirectories: [],
    client: CLIENT,
    effective: { source: "installation", directories: [] },
    monitoredDirectories: ["C:\\Users\\ana\\Documents", "C:\\Users\\ana\\Desktop"],
    missingDirectories: [],
    reportedAt: "2026-11-14T11:00:00.000Z",
    pending: false,
    ...overrides,
  };
}

function renderPanel(props: Partial<Parameters<typeof MonitoredDirectoriesPanel>[0]> = {}) {
  const onSave = vi.fn().mockResolvedValue(undefined);

  render(
    <MonitoredDirectoriesPanel
      hostname="SRV-ARQUIVOS"
      directories={directories()}
      loading={false}
      error={null}
      onSave={onSave}
      {...props}
    />,
  );

  return { onSave };
}

describe("MonitoredDirectoriesPanel", () => {
  it("deve mostrar as pastas que o agente monitora e de onde vieram", () => {
    renderPanel();

    const list = screen.getByRole("list", { name: "Monitorando agora" });
    expect(within(list).getByText("C:\\Users\\ana\\Documents")).toBeInTheDocument();
    expect(
      screen.getByText("Pastas da instalação do agente de SRV-ARQUIVOS."),
    ).toBeInTheDocument();
    expect(screen.getByText(/Informado pelo agente em/)).toBeInTheDocument();
  });

  it("deve dizer quando o PC segue o cliente e não monitora pastas", () => {
    renderPanel({
      directories: directories({
        client: { ...CLIENT, mode: "custom" },
        effective: { source: "client", directories: [] },
        monitoredDirectories: [],
      }),
    });

    expect(screen.getByText("Seguindo o cliente 1RIJOINVILLE.")).toBeInTheDocument();
    expect(
      screen.getByText("Nenhuma pasta monitorada: este PC só envia métricas."),
    ).toBeInTheDocument();
  });

  it("deve avisar quando a mudança ainda não foi aplicada e listar as pastas que faltam", () => {
    renderPanel({
      directories: directories({
        mode: "custom",
        configuredDirectories: ["D:\\Escrituras", "D:\\Removida"],
        effective: { source: "endpoint", directories: ["D:\\Escrituras", "D:\\Removida"] },
        pending: true,
        missingDirectories: ["D:\\Removida"],
      }),
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      "Aguardando o agente aplicar a mudança",
    );
    expect(
      within(screen.getByRole("list", { name: "Pastas não encontradas" })).getByText(
        "D:\\Removida",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Lista própria de SRV-ARQUIVOS.")).toBeInTheDocument();
  });

  it("deve explicar quando o agente ainda não informou as pastas", () => {
    renderPanel({
      directories: directories({ monitoredDirectories: [], reportedAt: null }),
    });

    expect(screen.getByText(/Agentes anteriores à versão 1.11.0/)).toBeInTheDocument();
  });

  it("deve criar uma lista própria a partir do que o agente monitora", async () => {
    const user = userEvent.setup();
    const { onSave } = renderPanel();

    await user.click(screen.getByRole("button", { name: "Editar pastas" }));
    expect(screen.getByRole("radio", { name: "Seguir o cliente 1RIJOINVILLE" })).toBeChecked();
    expect(screen.queryByRole("list", { name: "Pastas a monitorar" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Lista própria deste PC" }));
    const draft = screen.getByRole("list", { name: "Pastas a monitorar" });
    expect(within(draft).getAllByRole("listitem")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Remover C:\\Users\\ana\\Desktop" }));
    await user.type(screen.getByLabelText("Caminho da pasta"), "D:\\Escrituras");
    await user.click(screen.getByRole("button", { name: "Adicionar" }));
    await user.click(screen.getByRole("button", { name: "Salvar pastas" }));

    expect(onSave).toHaveBeenCalledWith({
      mode: "custom",
      directories: ["C:\\Users\\ana\\Documents", "D:\\Escrituras"],
    });
    expect(screen.queryByRole("list", { name: "Pastas a monitorar" })).not.toBeInTheDocument();
  });

  it("deve voltar a seguir o cliente", async () => {
    const user = userEvent.setup();
    const { onSave } = renderPanel({
      directories: directories({
        mode: "custom",
        configuredDirectories: ["D:\\Escrituras"],
        effective: { source: "endpoint", directories: ["D:\\Escrituras"] },
      }),
    });

    await user.click(screen.getByRole("button", { name: "Editar pastas" }));
    expect(screen.getByRole("radio", { name: "Lista própria deste PC" })).toBeChecked();

    await user.click(screen.getByRole("radio", { name: "Seguir o cliente 1RIJOINVILLE" }));
    await user.click(screen.getByRole("button", { name: "Salvar pastas" }));

    expect(onSave).toHaveBeenCalledWith({ mode: "inherit", directories: [] });
  });

  it("deve oferecer as pastas da instalação para PCs sem cliente", async () => {
    const user = userEvent.setup();
    renderPanel({ directories: directories({ client: null }) });

    await user.click(screen.getByRole("button", { name: "Editar pastas" }));

    expect(
      screen.getByRole("radio", { name: "Usar as pastas da instalação do agente" }),
    ).toBeChecked();
  });

  it("deve recusar caminhos inválidos ou repetidos sem chamar a API", async () => {
    const user = userEvent.setup();
    const { onSave } = renderPanel();

    await user.click(screen.getByRole("button", { name: "Editar pastas" }));
    await user.click(screen.getByRole("radio", { name: "Lista própria deste PC" }));
    const input = screen.getByLabelText("Caminho da pasta");

    await user.type(input, "R:dados");
    await user.click(screen.getByRole("button", { name: "Adicionar" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Use um caminho completo");

    await user.clear(input);
    await user.type(input, "c:\\users\\ana\\documents");
    await user.click(screen.getByRole("button", { name: "Adicionar" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Essa pasta já está na lista.");

    expect(onSave).not.toHaveBeenCalled();
  });

  it("deve mostrar o erro ao salvar e manter a edição aberta", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new Error("400"));
    renderPanel({ onSave });

    await user.click(screen.getByRole("button", { name: "Editar pastas" }));
    await user.click(screen.getByRole("button", { name: "Salvar pastas" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível salvar as pastas.",
    );
    expect(screen.getByRole("button", { name: "Salvar pastas" })).toBeInTheDocument();
  });

  it("deve mostrar o carregamento e o erro de leitura", () => {
    renderPanel({ directories: null, loading: true, error: "Falhou." });

    expect(screen.getByText("Carregando pastas...")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Falhou.");
    expect(screen.queryByRole("button", { name: "Editar pastas" })).not.toBeInTheDocument();
  });
});
