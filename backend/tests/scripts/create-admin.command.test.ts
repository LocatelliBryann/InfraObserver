import { describe, expect, it, vi } from "vitest";

import {
  parseCreateAdminArgs,
  runCreateAdmin,
} from "../../src/scripts/create-admin.command";

function createDeps(answers: string[], created = true) {
  const queue = [...answers];

  return {
    authService: {
      upsertAdmin: vi.fn(async (input: { email: string; name: string }) => ({
        user: { id: 1, email: input.email, name: input.name, role: "ADMIN" },
        created,
      })),
    },
    askPassword: vi.fn(async () => queue.shift() ?? ""),
    print: vi.fn(),
  };
}

describe("create-admin command", () => {
  it("should parse email and name", () => {
    expect(
      parseCreateAdminArgs(["--email", "a@b.com", "--name", "Bryann"]),
    ).toEqual({ email: "a@b.com", name: "Bryann" });
    expect(parseCreateAdminArgs([])).toEqual({ name: "Administrador" });
  });

  it("should require the email", async () => {
    const deps = createDeps([]);

    await expect(runCreateAdmin({ name: "Admin" }, deps)).resolves.toBe(1);
    expect(deps.askPassword).not.toHaveBeenCalled();
  });

  it("should stop when the passwords differ", async () => {
    const deps = createDeps(["senha-longa-123", "outra-senha-123"]);

    await expect(
      runCreateAdmin({ email: "a@b.com", name: "Admin" }, deps),
    ).resolves.toBe(1);
    expect(deps.print).toHaveBeenCalledWith("As senhas não conferem.");
    expect(deps.authService.upsertAdmin).not.toHaveBeenCalled();
  });

  it("should reject a short password", async () => {
    const deps = createDeps(["curta", "curta"]);

    await expect(
      runCreateAdmin({ email: "a@b.com", name: "Admin" }, deps),
    ).resolves.toBe(1);
    expect(deps.authService.upsertAdmin).not.toHaveBeenCalled();
  });

  it("should create the admin with a normalized email", async () => {
    const deps = createDeps(["senha-longa-123", "senha-longa-123"]);

    await expect(
      runCreateAdmin({ email: " Admin@B.com ", name: "Admin" }, deps),
    ).resolves.toBe(0);
    expect(deps.authService.upsertAdmin).toHaveBeenCalledWith({
      email: "admin@b.com",
      name: "Admin",
      password: "senha-longa-123",
    });
    expect(deps.print).toHaveBeenCalledWith("Administrador admin@b.com criado.");
  });

  it("should report a password reset for an existing admin", async () => {
    const deps = createDeps(["senha-longa-123", "senha-longa-123"], false);

    await runCreateAdmin({ email: "a@b.com", name: "Admin" }, deps);

    expect(deps.print).toHaveBeenCalledWith("Senha de a@b.com atualizada.");
  });
});
