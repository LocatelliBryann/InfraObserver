import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FileEventsSection } from "../../src/components/FileEventsSection";
import type {
  FileEvent,
  FileEventFilters,
} from "../../src/services/fileEventsService";

const NO_FILTERS: FileEventFilters = { eventTypes: [], search: "" };

function makeEvent(overrides: Partial<FileEvent> = {}): FileEvent {
  return {
    id: 1,
    endpointId: 1,
    eventType: "CREATE",
    filePath: "C:\\Users\\ana\\Documents\\relatorio.docx",
    username: "ana",
    occurredAt: "2026-11-07T12:00:00.000Z",
    receivedAt: "2026-11-07T12:00:01.000Z",
    isDirectory: false,
    endpoint: { hostname: "FILESERVER-01" },
    ...overrides,
  };
}

function renderSection(
  props: Partial<Parameters<typeof FileEventsSection>[0]> = {},
) {
  const onFiltersChange = vi.fn();

  render(
    <FileEventsSection
      events={[]}
      loading={false}
      error={null}
      filters={NO_FILTERS}
      onFiltersChange={onFiltersChange}
      {...props}
    />,
  );

  return { onFiltersChange };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("FileEventsSection", () => {
  it("mostra o tipo do evento em português", () => {
    renderSection({
      events: [
        makeEvent({ id: 1, eventType: "CREATE" }),
        makeEvent({ id: 2, eventType: "DELETE" }),
      ],
    });

    const list = screen.getByRole("list");
    expect(list.textContent).toContain("Criado");
    expect(list.textContent).toContain("Excluído");
    expect(screen.getAllByText("ana")).toHaveLength(2);
  });

  it("mostra o caminho de origem e o de destino em renomeações e movimentações", () => {
    renderSection({
      events: [
        makeEvent({
          eventType: "MOVE",
          previousPath: "C:\\Users\\ana\\Downloads\\nota.pdf",
          filePath: "C:\\Users\\ana\\Documents\\nota.pdf",
        }),
      ],
    });

    const item = screen.getByRole("listitem");
    expect(item.textContent).toContain("Movido");
    expect(item.textContent).toContain("De C:\\Users\\ana\\Downloads\\nota.pdf");
    expect(item.textContent).toContain("C:\\Users\\ana\\Documents\\nota.pdf");
  });

  it("marca eventos de pasta e mostra o IP de origem", () => {
    renderSection({
      events: [
        makeEvent({
          eventType: "DELETE",
          isDirectory: true,
          sourceIp: "10.0.0.25",
          filePath: "\\\\fileserver\\financeiro\\2025",
        }),
      ],
    });

    expect(screen.getByText("Pasta")).toBeTruthy();
    expect(screen.getByText("Origem 10.0.0.25")).toBeTruthy();
  });

  it("mostra o tipo original quando o evento vem de um agente antigo", () => {
    renderSection({ events: [makeEvent({ eventType: "created" as FileEvent["eventType"] })] });

    expect(screen.getByText("created")).toBeTruthy();
  });

  it("adiciona e remove tipos do filtro", async () => {
    const user = userEvent.setup();
    const { onFiltersChange } = renderSection();

    await user.click(screen.getByRole("button", { name: "Excluído" }));
    expect(onFiltersChange).toHaveBeenLastCalledWith({
      eventTypes: ["DELETE"],
      search: "",
    });
  });

  it("indica os filtros ativos e volta para todos", async () => {
    const user = userEvent.setup();
    const { onFiltersChange } = renderSection({
      filters: { eventTypes: ["DELETE", "MOVE"], search: "" },
    });

    expect(
      screen.getByRole("button", { name: "Excluído" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen.getByRole("button", { name: "Todos" }).getAttribute("aria-pressed"),
    ).toBe("false");

    await user.click(screen.getByRole("button", { name: "Movido" }));
    expect(onFiltersChange).toHaveBeenLastCalledWith({
      eventTypes: ["DELETE"],
      search: "",
    });

    await user.click(screen.getByRole("button", { name: "Todos" }));
    expect(onFiltersChange).toHaveBeenLastCalledWith({
      eventTypes: [],
      search: "",
    });
  });

  it("só busca depois que o usuário para de digitar", () => {
    vi.useFakeTimers();
    const { onFiltersChange } = renderSection();

    fireEvent.change(
      screen.getByRole("searchbox", { name: "Buscar por arquivo, pasta ou usuário" }),
      { target: { value: "contrato" } },
    );

    expect(onFiltersChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(onFiltersChange).toHaveBeenCalledWith({
      eventTypes: [],
      search: "contrato",
    });
  });

  it("limpa a busca e os tipos de uma vez", async () => {
    const user = userEvent.setup();
    const { onFiltersChange } = renderSection({
      filters: { eventTypes: ["DELETE"], search: "contrato" },
    });

    await user.click(screen.getByRole("button", { name: "Limpar filtros" }));

    expect(onFiltersChange).toHaveBeenLastCalledWith({
      eventTypes: [],
      search: "",
    });
  });

  it("diferencia lista vazia de filtro sem resultado", () => {
    const { unmount } = render(
      <FileEventsSection
        events={[]}
        loading={false}
        error={null}
        filters={NO_FILTERS}
        onFiltersChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Nenhuma atividade registrada")).toBeTruthy();
    unmount();

    renderSection({ filters: { eventTypes: ["MOVE"], search: "" } });
    expect(screen.getByText("Nenhum evento encontrado")).toBeTruthy();
  });

  it("mostra carregamento e erro", () => {
    const { unmount } = render(
      <FileEventsSection
        events={[]}
        loading
        error={null}
        filters={NO_FILTERS}
        onFiltersChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Carregando atividades recentes...")).toBeTruthy();
    unmount();

    renderSection({ error: "falhou" });
    expect(
      screen.getByText("Não foi possível carregar as atividades recentes."),
    ).toBeTruthy();
  });
});
