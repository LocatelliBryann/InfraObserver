import { prisma } from "../database/prisma";

// Token de instalação sem o hash e sem o valor cifrado: é o que a API devolve.
export interface EnrollmentTokenRecord {
  id: number;
  clientId: number;
  prefix: string;
  createdAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  usageCount: number;
  // Se o token pode ser copiado de novo no dashboard.
  revealable: boolean;
}

export interface EnrollmentTokenRepository {
  create(data: {
    clientId: number;
    tokenHash: string;
    prefix: string;
    encryptedToken?: string;
    expiresAt?: Date;
  }): Promise<EnrollmentTokenRecord>;

  findByHash(tokenHash: string): Promise<EnrollmentTokenRecord | null>;

  findById(id: number): Promise<EnrollmentTokenRecord | null>;

  findByClientId(clientId: number): Promise<EnrollmentTokenRecord[]>;

  // Valor cifrado, só para copiar de novo; nunca vai na listagem.
  findEncryptedToken(id: number): Promise<string | null>;

  revoke(id: number, revokedAt: Date): Promise<EnrollmentTokenRecord>;

  registerUse(id: number, usedAt: Date): Promise<void>;
}

const SELECTED_FIELDS = {
  id: true,
  clientId: true,
  prefix: true,
  createdAt: true,
  expiresAt: true,
  revokedAt: true,
  lastUsedAt: true,
  usageCount: true,
  encryptedToken: true,
} as const;

type SelectedToken = Omit<EnrollmentTokenRecord, "revealable"> & {
  encryptedToken: string | null;
};

function toRecord({
  encryptedToken,
  ...token
}: SelectedToken): EnrollmentTokenRecord {
  return { ...token, revealable: encryptedToken !== null };
}

function toRecordOrNull(token: SelectedToken | null) {
  return token ? toRecord(token) : null;
}

export class PrismaEnrollmentTokenRepository
  implements EnrollmentTokenRepository
{
  async create(data: {
    clientId: number;
    tokenHash: string;
    prefix: string;
    encryptedToken?: string;
    expiresAt?: Date;
  }) {
    return toRecord(
      await prisma.enrollmentToken.create({
        data,
        select: SELECTED_FIELDS,
      }),
    );
  }

  async findByHash(tokenHash: string) {
    return toRecordOrNull(
      await prisma.enrollmentToken.findUnique({
        where: { tokenHash },
        select: SELECTED_FIELDS,
      }),
    );
  }

  async findById(id: number) {
    return toRecordOrNull(
      await prisma.enrollmentToken.findUnique({
        where: { id },
        select: SELECTED_FIELDS,
      }),
    );
  }

  async findByClientId(clientId: number) {
    const tokens = await prisma.enrollmentToken.findMany({
      where: { clientId },
      select: SELECTED_FIELDS,
      orderBy: { createdAt: "desc" },
    });

    return tokens.map(toRecord);
  }

  async findEncryptedToken(id: number) {
    const token = await prisma.enrollmentToken.findUnique({
      where: { id },
      select: { encryptedToken: true },
    });

    return token?.encryptedToken ?? null;
  }

  // Revogado, o token não precisa mais ser copiado: o valor cifrado é apagado.
  async revoke(id: number, revokedAt: Date) {
    return toRecord(
      await prisma.enrollmentToken.update({
        where: { id },
        data: { revokedAt, encryptedToken: null },
        select: SELECTED_FIELDS,
      }),
    );
  }

  async registerUse(id: number, usedAt: Date) {
    await prisma.enrollmentToken.update({
      where: { id },
      data: {
        lastUsedAt: usedAt,
        usageCount: { increment: 1 },
      },
    });
  }
}
