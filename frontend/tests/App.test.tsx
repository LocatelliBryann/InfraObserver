import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import App from "../src/App";

describe("Dashboard do InfraObserver", () => {
  it("deve exibir o título principal do sistema", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: /InfraObserver/i,
      }),
    ).toBeInTheDocument();
  });

  it("deve exibir a seção de visão geral", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", {
        name: /Visão geral/i,
      }),
    ).toBeInTheDocument();
  });

  it("deve exibir o indicador de endpoints monitorados", () => {
    render(<App />);

    expect(
      screen.getByText(/Endpoints monitorados/i),
    ).toBeInTheDocument();
  });

  it("deve exibir a seção de saúde do sistema", () => {
    render(<App />);

    expect(
      screen.getByText(/Saúde do sistema/i),
    ).toBeInTheDocument();
  });
});