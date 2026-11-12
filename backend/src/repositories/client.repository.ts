import { prisma } from "../database/prisma";

export interface ClientRecord {
  id: number;
  name: string;
  createdAt: Date;
}

export interface ClientSummary extends ClientRecord {
  endpointCount: number;
  activeTokenCount: number;
}

export interface ClientRepository {
  findAll(now: Date): Promise<ClientSummary[]>;

  findById(id: number): Promise<ClientRecord | null>;

  findByName(name: string): Promise<ClientRecord | null>;

  create(name: string): Promise<ClientRecord>;
}

export class PrismaClientRepository implements ClientRepository {
  async findAll(now: Date) {
    const clients = await prisma.client.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: {
          select: {
            endpoints: true,
            // Tokens ainda válidos: não revogados e sem validade vencida.
            enrollmentTokens: {
              where: {
                revokedAt: null,
                OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return clients.map(({ _count, ...client }) => ({
      ...client,
      endpointCount: _count.endpoints,
      activeTokenCount: _count.enrollmentTokens,
    }));
  }

  async findById(id: number) {
    return prisma.client.findUnique({
      where: { id },
      select: { id: true, name: true, createdAt: true },
    });
  }

  async findByName(name: string) {
    return prisma.client.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { id: true, name: true, createdAt: true },
    });
  }

  async create(name: string) {
    return prisma.client.create({
      data: { name },
      select: { id: true, name: true, createdAt: true },
    });
  }
}
