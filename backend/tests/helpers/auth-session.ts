import { SESSION_COOKIE_NAME } from "../../src/config/auth";
import { authService } from "../../src/config/dependencies";

export const TEST_ADMIN = {
  email: "admin.tests@infraobserver.local",
  name: "Admin de Testes",
  password: "senha-de-testes-123",
};

async function upsertTestAdmin() {
  try {
    return await authService.upsertAdmin(TEST_ADMIN);
  } catch {
    // Os arquivos de teste rodam em paralelo: com o banco vazio, dois deles
    // podem tentar criar o mesmo administrador ao mesmo tempo e um recebe
    // erro de e-mail duplicado. Na segunda tentativa ele já existe.
    return authService.upsertAdmin(TEST_ADMIN);
  }
}

// Cria (ou atualiza) o administrador de testes e devolve o cabeçalho Cookie
// com uma sessão válida, para as rotas que exigem login.
export async function createSessionCookie(): Promise<string> {
  const { user } = await upsertTestAdmin();

  return `${SESSION_COOKIE_NAME}=${authService.signToken(user)}`;
}