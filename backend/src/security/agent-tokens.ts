import { createHash, randomBytes } from "node:crypto";

// Token de instalação: um por cliente, usado no instalador de vários PCs.
export const ENROLLMENT_TOKEN_PREFIX = "ioe_";
// Credencial do agente: uma por PC, recebida na primeira conexão.
export const AGENT_CREDENTIAL_PREFIX = "ioa_";

const TOKEN_BYTES = 32;
// Quantos caracteres do começo do token aparecem na lista do dashboard.
const DISPLAY_PREFIX_LENGTH = 12;

// 32 bytes aleatórios (256 bits) em base64url: impossível de adivinhar.
export function generateToken(prefix: string): string {
  return `${prefix}${randomBytes(TOKEN_BYTES).toString("base64url")}`;
}

// O hash é o que confere o token. SHA-256 basta aqui (sem bcrypt), porque o token
// é aleatório e longo: não há senha fraca para quebrar por dicionário.
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function displayPrefix(token: string): string {
  return token.slice(0, DISPLAY_PREFIX_LENGTH);
}
