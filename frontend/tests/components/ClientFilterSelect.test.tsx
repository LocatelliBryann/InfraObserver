import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import "@testing-library/jest-dom/vitest";

import { ClientFilterSelect } from "../../src/components/ClientFilterSelect";

const clients = [
  { id: 1, name: "1RIJOINVILLE", createdAt: "", endpointCount: 1, activeTokenCount: 1 },
  { id: 2, name: "Escritório Souza", createdAt: "", endpointCount: 0, activeTokenCount: 0 },
];

describe("ClientFilterSelect", () => {
  it("lista todos, cada cliente e os PCs sem cliente", () => {
    render(<ClientFilterSelect clients={clients} value={undefined} onChange={vi.fn()} />);

    const options = screen.getAllByRole("option").map((option) => option.textContent);

    expect(options).toEqual([
      "Todos os clientes",
      "1RIJOINVILLE",
      "Escritório Souza",
      "Sem cliente",
    ]);
    expect(screen.getByLabelText("Cliente")).toHaveValue("");
  });

  it("mostra o filtro atual", () => {
    const { rerender } = render(
      <ClientFilterSelect clients={clients} value={2} onChange={vi.fn()} />,
    );

    expect(screen.getByLabelText("Cliente")).toHaveValue("2");

    rerender(<ClientFilterSelect clients={clients} value="none" onChange={vi.fn()} />);

    expect(screen.getByLabelText("Cliente")).toHaveValue("none");
  });

  it("avisa a troca de filtro", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ClientFilterSelect clients={clients} value={2} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText("Cliente"), "1RIJOINVILLE");
    expect(onChange).toHaveBeenLastCalledWith(1);

    await user.selectOptions(screen.getByLabelText("Cliente"), "Sem cliente");
    expect(onChange).toHaveBeenLastCalledWith("none");

    await user.selectOptions(screen.getByLabelText("Cliente"), "Todos os clientes");
    expect(onChange).toHaveBeenLastCalledWith(undefined);
  });
});
