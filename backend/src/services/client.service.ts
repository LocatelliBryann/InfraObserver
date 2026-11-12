import type {
  ClientRepository,
} from "../repositories/client.repository";
import type {
  EnrollmentTokenRecord,
  EnrollmentTokenRepository,
} from "../repositories/enrollment-token.repository";
import {
  displayPrefix,
  ENROLLMENT_TOKEN_PREFIX,
  generateToken,
  hashToken,
} from "../security/agent-tokens";
import { decryptToken, encryptToken } from "../security/token-encryption";

export class ClientNameTakenError extends Error {
  constructor() {
    super("Client name already in use");
    this.name = "ClientNameTakenError";
  }
}

export class ClientNotFoundError extends Error {
  constructor() {
    super("Client not found");
    this.name = "ClientNotFoundError";
  }
}

export class EnrollmentTokenNotFoundError extends Error {
  constructor() {
    super("Enrollment token not found");
    this.name = "EnrollmentTokenNotFoundError";
  }
}

export class EnrollmentTokenNotRevealableError extends Error {
  constructor() {
    super("Enrollment token cannot be shown again");
    this.name = "EnrollmentTokenNotRevealableError";
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}

export class ClientService {
  constructor(
    private readonly clients: ClientRepository,
    private readonly tokens: EnrollmentTokenRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly encrypt: (token: string) => string = encryptToken,
    private readonly decrypt: (value: string) => string | null = decryptToken,
  ) {}

  async findAll() {
    return this.clients.findAll(this.now());
  }

  async create(name: string) {
    if (await this.clients.findByName(name)) {
      throw new ClientNameTakenError();
    }

    try {
      return await this.clients.create(name);
    } catch (error) {
      // Dois cadastros com o mesmo nome ao mesmo tempo.
      if (isUniqueViolation(error)) {
        throw new ClientNameTakenError();
      }

      throw error;
    }
  }

  async findEnrollmentTokens(clientId: number) {
    await this.requireClient(clientId);

    return this.tokens.findByClientId(clientId);
  }

  // Gera um token de instalação. O banco guarda o hash (para conferir na
  // instalação), o começo do token (para a lista) e o token cifrado (para o
  // administrador copiar de novo enquanto o token estiver ativo).
  async createEnrollmentToken(
    clientId: number,
    options: { expiresInDays?: number } = {},
  ): Promise<{ token: string; enrollmentToken: EnrollmentTokenRecord }> {
    await this.requireClient(clientId);

    const token = generateToken(ENROLLMENT_TOKEN_PREFIX);
    const expiresAt =
      options.expiresInDays === undefined
        ? undefined
        : new Date(this.now().getTime() + options.expiresInDays * DAY_MS);

    const enrollmentToken = await this.tokens.create({
      clientId,
      tokenHash: hashToken(token),
      prefix: displayPrefix(token),
      encryptedToken: this.encrypt(token),
      expiresAt,
    });

    return { token, enrollmentToken };
  }

  // Devolve o token completo de novo, para instalar mais PCs do cliente.
  // Só para tokens ativos e gerados depois desta versão (com valor cifrado).
  async revealEnrollmentToken(clientId: number, tokenId: number) {
    const token = await this.tokens.findById(tokenId);

    if (!token || token.clientId !== clientId) {
      throw new EnrollmentTokenNotFoundError();
    }

    const now = this.now();
    const inactive =
      token.revokedAt !== null ||
      (token.expiresAt !== null && token.expiresAt <= now);

    const encrypted = inactive
      ? null
      : await this.tokens.findEncryptedToken(tokenId);
    const value = encrypted ? this.decrypt(encrypted) : null;

    if (!value) {
      throw new EnrollmentTokenNotRevealableError();
    }

    return value;
  }

  // Revogar o token impede novas instalações. Os PCs já instalados continuam,
  // porque cada um tem a sua credencial (revogada pelo endpoint).
  async revokeEnrollmentToken(clientId: number, tokenId: number) {
    const token = await this.tokens.findById(tokenId);

    if (!token || token.clientId !== clientId) {
      throw new EnrollmentTokenNotFoundError();
    }

    if (token.revokedAt) {
      return token;
    }

    return this.tokens.revoke(tokenId, this.now());
  }

  private async requireClient(clientId: number) {
    const client = await this.clients.findById(clientId);

    if (!client) {
      throw new ClientNotFoundError();
    }

    return client;
  }
}
