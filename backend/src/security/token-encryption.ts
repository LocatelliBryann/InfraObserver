import {
  createCipheriv,
  createDecipheriv,
  hkdfSync,
  randomBytes,
} from "node:crypto";

import { getJwtSecret } from "../config/auth";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;
const FORMAT_VERSION = "v1";

// Chave própria para cifrar os tokens de instalação, derivada do JWT_SECRET
// com HKDF. O "info" diferente separa esta chave da assinatura das sessões:
// conhecer uma não ajuda a descobrir a outra. Trocar o JWT_SECRET torna os
// tokens antigos impossíveis de copiar de novo (eles continuam funcionando).
function encryptionKey(secret: string): Buffer {
  return Buffer.from(
    hkdfSync(
      "sha256",
      secret,
      "infraobserver",
      "enrollment-token-encryption",
      KEY_BYTES,
    ),
  );
}

// Formato: v1.<iv>.<tag>.<texto cifrado>, tudo em base64url.
export function encryptToken(
  token: string,
  secret: string = getJwtSecret(),
): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(secret), iv);
  const ciphertext = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);

  return [
    FORMAT_VERSION,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

// Devolve null se o valor estiver corrompido ou tiver sido cifrado com outro
// segredo (o GCM confere a integridade antes de devolver qualquer coisa).
export function decryptToken(
  encrypted: string,
  secret: string = getJwtSecret(),
): string | null {
  const [version, iv, tag, ciphertext] = encrypted.split(".");

  if (version !== FORMAT_VERSION || !iv || !tag || ciphertext === undefined) {
    return null;
  }

  try {
    const ivBuffer = Buffer.from(iv, "base64url");
    const tagBuffer = Buffer.from(tag, "base64url");

    if (ivBuffer.length !== IV_BYTES || tagBuffer.length !== TAG_BYTES) {
      return null;
    }

    const decipher = createDecipheriv(ALGORITHM, encryptionKey(secret), ivBuffer);
    decipher.setAuthTag(tagBuffer);

    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}
