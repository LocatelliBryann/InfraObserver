import { expect, test } from "@playwright/test";

import { signIn } from "./helpers";

test.describe("Clientes", () => {
  test("cadastra um cliente, gera e revoga um token de instalação", async ({ page }) => {
    const clientName = `Cliente E2E ${Date.now()}`;

    await signIn(page);
    await page.getByRole("link", { name: "Clientes" }).click();
    await expect(page).toHaveURL(/\/clientes$/);
    await expect(page.getByRole("heading", { name: "Clientes" })).toBeVisible();

    await page.getByPlaceholder("Nome do cliente").fill(clientName);
    await page.getByRole("button", { name: "Adicionar" }).click();

    const clientList = page.getByRole("list", { name: "Lista de clientes" });
    await clientList.getByText(clientName).click();

    await page.getByRole("button", { name: "Gerar token" }).click();
    await expect(page.getByText("Token gerado.", { exact: false })).toBeVisible();

    const tokens = page.getByRole("list", { name: "Tokens de instalação" });
    await expect(tokens.getByText("Ativo")).toBeVisible();

    await tokens.getByRole("button", { name: /^Revogar o token/ }).click();
    await tokens.getByRole("button", { name: "Confirmar revogação" }).click();
    await expect(tokens.getByText("Revogado")).toBeVisible();
  });
});
