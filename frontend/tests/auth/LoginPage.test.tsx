import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import "@testing-library/jest-dom/vitest";

import { LoginPage } from "../../src/auth/LoginPage";
import { ApiError } from "../../src/services/apiClient";

describe("LoginPage", () => {
  it("should submit the trimmed email and the password", async () => {
    const onLogin = vi.fn().mockResolvedValue(undefined);
    render(<LoginPage onLogin={onLogin} />);

    await userEvent.type(screen.getByLabelText("E-mail"), "  admin@x.com ");
    await userEvent.type(screen.getByLabelText("Senha"), "senha-123");
    await userEvent.click(screen.getByRole("button", { name: /Entrar/ }));

    expect(onLogin).toHaveBeenCalledWith("admin@x.com", "senha-123");
  });

  it("should ask for both fields before calling the API", async () => {
    const onLogin = vi.fn();
    render(<LoginPage onLogin={onLogin} />);

    await userEvent.click(screen.getByRole("button", { name: /Entrar/ }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Informe o e-mail e a senha.",
    );
    expect(onLogin).not.toHaveBeenCalled();
  });

  it("should show the error and clear the password on wrong credentials", async () => {
    const onLogin = vi.fn().mockRejectedValue(new ApiError(401));
    render(<LoginPage onLogin={onLogin} />);

    await userEvent.type(screen.getByLabelText("E-mail"), "admin@x.com");
    await userEvent.type(screen.getByLabelText("Senha"), "errada");
    await userEvent.click(screen.getByRole("button", { name: /Entrar/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "E-mail ou senha incorretos.",
    );
    expect(screen.getByLabelText("Senha")).toHaveValue("");
  });

  it("should warn when the login is blocked by too many attempts", async () => {
    const onLogin = vi.fn().mockRejectedValue(new ApiError(429));
    render(<LoginPage onLogin={onLogin} />);

    await userEvent.type(screen.getByLabelText("E-mail"), "admin@x.com");
    await userEvent.type(screen.getByLabelText("Senha"), "errada");
    await userEvent.click(screen.getByRole("button", { name: /Entrar/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Muitas tentativas");
  });

  it("should toggle the password visibility", async () => {
    render(<LoginPage onLogin={vi.fn()} />);
    const password = screen.getByLabelText("Senha");

    expect(password).toHaveAttribute("type", "password");

    await userEvent.click(screen.getByRole("button", { name: "Mostrar senha" }));

    expect(password).toHaveAttribute("type", "text");
  });
});
