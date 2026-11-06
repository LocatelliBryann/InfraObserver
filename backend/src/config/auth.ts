// Configuração do login de administrador.

export const SESSION_COOKIE_NAME = "infraobserver_session";

const DEFAULT_SESSION_HOURS = 8;
const MIN_JWT_SECRET_LENGTH = 32;

// Usado só em desenvolvimento e testes. Em produção o JWT_SECRET é obrigatório.
const DEVELOPMENT_JWT_SECRET = "infraobserver-development-secret-not-for-production";

const DEFAULT_ALLOWED_ORIGINS = ["http://localhost:5173"];

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (secret !== undefined && secret.trim() !== "") {
    if (secret.length < MIN_JWT_SECRET_LENGTH) {
      throw new Error(
        `JWT_SECRET must have at least ${MIN_JWT_SECRET_LENGTH} characters`,
      );
    }

    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET is not configured");
  }

  return DEVELOPMENT_JWT_SECRET;
}

export function getSessionDurationSeconds(): number {
  const rawValue = process.env.SESSION_HOURS;

  if (rawValue === undefined || rawValue.trim() === "") {
    return DEFAULT_SESSION_HOURS * 60 * 60;
  }

  const hours = Number(rawValue);

  if (!Number.isFinite(hours) || hours <= 0) {
    throw new Error("SESSION_HOURS must be a positive number");
  }

  return Math.round(hours * 60 * 60);
}

// Cookie com a flag Secure (só trafega por HTTPS) em produção.
export function isSecureCookie(): boolean {
  return process.env.NODE_ENV === "production";
}

// Origens de outro domínio que podem chamar a API com o cookie de sessão.
// Em produção o dashboard e a API estão no mesmo domínio e a lista não é usada.
export function getAllowedOrigins(): string[] {
  const rawValue = process.env.CORS_ORIGINS;

  if (rawValue === undefined || rawValue.trim() === "") {
    return DEFAULT_ALLOWED_ORIGINS;
  }

  return rawValue
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

// Falha na inicialização, e não no primeiro login, se faltar configuração.
export function assertAuthConfiguration(): void {
  getJwtSecret();
  getSessionDurationSeconds();
}
