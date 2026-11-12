import { describe, expect, it } from "vitest";

import { decryptToken, encryptToken } from "../../src/security/token-encryption";

const SECRET = "segredo-de-teste-com-mais-de-32-caracteres";
const TOKEN = "ioe_AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-abcd";

describe("token encryption", () => {
  it("decrypts what it encrypted", () => {
    const encrypted = encryptToken(TOKEN, SECRET);

    expect(encrypted).toMatch(/^v1\.[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(encrypted).not.toContain(TOKEN);
    expect(decryptToken(encrypted, SECRET)).toBe(TOKEN);
  });

  it("uses a new random IV each time", () => {
    expect(encryptToken(TOKEN, SECRET)).not.toBe(encryptToken(TOKEN, SECRET));
  });

  it("returns null with another secret", () => {
    const encrypted = encryptToken(TOKEN, SECRET);

    expect(decryptToken(encrypted, `${SECRET}-novo`)).toBeNull();
  });

  it("returns null when the value was changed", () => {
    const [version, iv, tag, ciphertext] = encryptToken(TOKEN, SECRET).split(".");
    const changed = `${ciphertext.slice(0, -2)}${ciphertext.endsWith("AA") ? "BB" : "AA"}`;

    expect(decryptToken([version, iv, tag, changed].join("."), SECRET)).toBeNull();
  });

  it.each(["", "texto", "v2.a.b.c", "v1.curto.b.c", "v1..."])(
    "returns null for an invalid value (%s)",
    (value) => {
      expect(decryptToken(value, SECRET)).toBeNull();
    },
  );

  it("uses the JWT secret by default", () => {
    expect(decryptToken(encryptToken(TOKEN))).toBe(TOKEN);
  });
});
