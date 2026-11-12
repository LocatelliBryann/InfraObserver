import { prisma } from "../database/prisma";

// Token de instalação sem o hash: é o que a API devolve.
export interface EnrollmentTokenRecord {
  id: number;
  clientId: number;
  prefix: string;
  createdAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
  usageCount: number;
}

export interface EnrollmentTokenRepository {
  create(data: {
    clientId: number;
    tokenHash: string;
    prefix: string;
    expiresAt?: Date;
  }): Promise<EnrollmentTokenRecord>;

  findByHash(tokenHash: string): Promise<EnrollmentTokenRecord | null>;

  findById(id: number): Promise<EnrollmentTokenRecord | null>;

  findByClientId(clientId: number): Promise<EnrollmentTokenRecord[]>;

  revoke(id: number, revokedAt: Date): Promise<EnrollmentTokenRecord>;

  registerUse(id: number, usedAt: Date): Promise<void>;
}

const PUBLIC_FIELDS = {
  id: true,
  clientId: true,
  prefix: true,
  createdAt: true,
  expiresAt: true,
  revokedAt: true,
  lastUsedAt: true,
  usageCount: true,
} as const;

export class PrismaEnrollmentTokenRepository
  implements EnrollmentTokenRepository
{
  async create(data: {
    clientId: number;
    tokenHash: string;
    prefix: string;
    expiresAt?: Date;
  }) {
    return prisma.enrollmentToken.create({
      data,
      select: PUBLIC_FIELDS,
    });
  }

  async findByHash(tokenHash: string) {
    return prisma.enrollmentToken.findUnique({
      where: { tokenHash },
      select: PUBLIC_FIELDS,
    });
  }

  async findById(id: number) {
    return prisma.enrollmentToken.findUnique({
      where: { id },
      select: PUBLIC_FIELDS,
    });
  }

  async findByClientId(clientId: number) {
    return prisma.enrollmentToken.findMany({
      where: { clientId },
      select: PUBLIC_FIELDS,
      orderBy: { createdAt: "desc" },
    });
  }

  async revoke(id: number, revokedAt: Date) {
    return prisma.enrollmentToken.update({
      where: { id },
      data: { revokedAt },
      select: PUBLIC_FIELDS,
    });
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
