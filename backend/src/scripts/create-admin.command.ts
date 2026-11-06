import type { AuthService } from "../services/auth.service";
import { createAdminSchema } from "../utils/validation/auth.schema";

export interface CreateAdminArgs {
  email?: string;
  name: string;
}

// Lê "--email x --name y" da linha de comando.
export function parseCreateAdminArgs(argv: string[]): CreateAdminArgs {
  const args: CreateAdminArgs = { name: "Administrador" };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];

    if (flag === "--email" && value) {
      args.email = value;
      index += 1;
    } else if (flag === "--name" && value) {
      args.name = value;
      index += 1;
    }
  }

  return args;
}

export interface CreateAdminDeps {
  authService: Pick<AuthService, "upsertAdmin">;
  askPassword: (question: string) => Promise<string>;
  print: (message: string) => void;
}

// Cria o administrador (ou troca a senha, se o e-mail já existir).
// A senha é digitada duas vezes no terminal e nunca aparece na tela nem no histórico.
export async function runCreateAdmin(
  args: CreateAdminArgs,
  deps: CreateAdminDeps,
): Promise<number> {
  if (!args.email) {
    deps.print("Uso: create-admin --email admin@exemplo.com [--name \"Nome\"]");
    return 1;
  }

  const password = await deps.askPassword("Senha: ");
  const confirmation = await deps.askPassword("Repita a senha: ");

  if (password !== confirmation) {
    deps.print("As senhas não conferem.");
    return 1;
  }

  const input = createAdminSchema.safeParse({
    email: args.email,
    name: args.name,
    password,
  });

  if (!input.success) {
    for (const issue of input.error.issues) {
      deps.print(`${issue.path.join(".")}: ${issue.message}`);
    }
    return 1;
  }

  const { user, created } = await deps.authService.upsertAdmin(input.data);

  deps.print(
    created
      ? `Administrador ${user.email} criado.`
      : `Senha de ${user.email} atualizada.`,
  );

  return 0;
}
