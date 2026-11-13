import { expect, test } from "@playwright/test";

import { adminCredentials } from "./env";
import { signIn } from "./helpers";

test.describe("Login", () => {
  test("recusa senha errada e mostra o motivo", async ({ page }) => {
    const { email } = adminCredentials();

    await page.goto("/");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha", { exact: true }).fill("senha-errada-de-proposito");
    await page.getByRole("button", { name: "Entrar" }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Visão geral" })).toBeHidden();
  });

  test("entra, continua logado ao recarregar e sai", async ({ page }) => {
    await signIn(page);

    // A sessão fica no cookie httpOnly: recarregar não pede login de novo.
    await page.reload();
    await expect(page.getByRole("heading", { name: "Visão geral" })).toBeVisible();

    await page.getByRole("button", { name: "Sair" }).click();
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();

    // Depois de sair, a página protegida volta para o login.
    await page.goto("/clientes");
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  });
});
