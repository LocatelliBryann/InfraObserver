import { SESSION_COOKIE_NAME } from "../../src/config/auth";
import { authService } from "../../src/config/dependencies";

export const TEST_ADMIN = {
  email: "admin.tests@infraobserver.local",
  name: "Admin de Testes",
  password: "senha-de-testes-123",
};

// Cria (ou atualiza) o administrador de testes e devolve o cabeçalho Cookie
// com uma sessão válida, para as rotas que exigem login.
export async function createSessionCookie(): Promise<string> {
  const { user } = await authService.upsertAdmin(TEST_ADMIN);

  return `${SESSION_COOKIE_NAME}=${authService.signToken(user)}`;
}
