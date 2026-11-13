import { expect, type Page } from "@playwright/test";

import { adminCredentials } from "./env";

export async function signIn(page: Page) {
  const { email, password } = adminCredentials();

  await page.goto("/");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();

  await expect(page.getByRole("heading", { name: "Visão geral" })).toBeVisible();
}
