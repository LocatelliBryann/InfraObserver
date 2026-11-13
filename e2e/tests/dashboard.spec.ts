import { expect, test } from "@playwright/test";

import { SEEDED_FILE, SEEDED_HOSTNAME, seededClientId } from "./env";
import { signIn } from "./helpers";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);

    // Só os PCs do cliente criado pelo global-setup (filtro guardado na URL).
    await page.goto(`/?cliente=${seededClientId()}`);
    await expect(page.getByRole("heading", { name: "Visão geral" })).toBeVisible();
  });

  test("mostra o PC registrado pelo agente e seus indicadores", async ({ page }) => {
    await expect(page.getByText("Endpoints monitorados")).toBeVisible();
    await expect(
      page
        .getByRole("list", { name: "Status dos endpoints" })
        .getByRole("button", { name: new RegExp(SEEDED_HOSTNAME) }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: SEEDED_HOSTNAME })).toBeVisible();

    // O filtro por cliente deixa só o PC registrado no setup.
    const indicator = page.getByRole("article").filter({ hasText: "Endpoints monitorados" });
    await expect(indicator.getByText("1", { exact: true })).toBeVisible();
  });

  test("mostra o evento de arquivo com o usuário confirmado pela auditoria", async ({ page }) => {
    const activity = page.getByRole("region", { name: "Atividade recente" });
    const fileName = SEEDED_FILE.split("\\").pop() ?? SEEDED_FILE;

    await expect(activity.getByText(fileName).first()).toBeVisible();
    await expect(activity.getByText("Auditado").first()).toBeVisible();
    await expect(activity.getByText("CARTORIO\\e2e.usuario").first()).toBeVisible();
  });
});
