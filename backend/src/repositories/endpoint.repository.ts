import { prisma } from "../database/prisma";
import {
  clientIdCondition,
  type ClientFilter,
} from "../utils/validation/query.schema";

// Endpoint como sai do banco. O hash da credencial fica de fora (omit no
// PrismaClient) e só é usado nas buscas por credencial.
export interface EndpointRecord {
  id: number;
  agentId: string;
  hostname: string;
  ipAddress: string;
  osName: string | null;
  osVersion: string | null;
  agentVersion: string | null;
  status: string;
  lastSeenAt: Date | null;
  clientId: number | null;
  credentialIssuedAt: Date | null;
  credentialRevokedAt: Date | null;
}

// Na lista do dashboard, o endpoint vem com o nome do cliente.
export interface EndpointWithClient extends EndpointRecord {
  client: { id: number; name: string } | null;
}

export interface EndpointCreateData {
  agentId: string;
  hostname: string;
  ipAddress: string;
  osName?: string;
  osVersion?: string;
  agentVersion?: string;
  status: string;
  lastSeenAt: Date;
  clientId?: number;
  credentialHash?: string;
  credentialIssuedAt?: Date;
}

export interface EndpointUpdateData {
  hostname?: string;
  ipAddress?: string;
  osName?: string;
  osVersion?: string;
  agentVersion?: string;
  status?: string;
  lastSeenAt?: Date;
  clientId?: number;
  credentialHash?: string;
  credentialIssuedAt?: Date;
  credentialRevokedAt?: Date | null;
}

export interface EndpointRepository {
  // Sem filtro, todos os endpoints; com filtro, só os do cliente (ou sem cliente).
  findAll(clientId?: ClientFilter): Promise<EndpointWithClient[]>;

  findById(id: number): Promise<EndpointRecord | null>;

  findByAgentId(agentId: string): Promise<EndpointRecord | null>;

  findByCredentialHash(credentialHash: string): Promise<EndpointRecord | null>;

  create(data: EndpointCreateData): Promise<EndpointRecord>;

  update(id: number, data: EndpointUpdateData): Promise<EndpointRecord>;

  findOnlineNotSeenSince(cutoff: Date): Promise<EndpointRecord[]>;
}

export class PrismaEndpointRepository
  implements EndpointRepository
{
  async findAll(clientId?: ClientFilter) {
    return prisma.endpoint.findMany({
      where: clientIdCondition(clientId),
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        hostname: "asc",
      },
    });
  }

  async findById(id: number) {
    return prisma.endpoint.findUnique({
      where: {
        id,
      },
    });
  }

  async findByAgentId(agentId: string) {
    return prisma.endpoint.findUnique({
      where: {
        agentId,
      },
    });
  }

  async findByCredentialHash(credentialHash: string) {
    return prisma.endpoint.findUnique({
      where: {
        credentialHash,
      },
    });
  }

  async create(data: EndpointCreateData) {
    return prisma.endpoint.create({
      data,
    });
  }

  async update(id: number, data: EndpointUpdateData) {
    return prisma.endpoint.update({
      where: {
        id,
      },
      data,
    });
  }

  async findOnlineNotSeenSince(cutoff: Date) {
    return prisma.endpoint.findMany({
      where: {
        status: "ONLINE",
        OR: [
          {
            lastSeenAt: null,
          },
          {
            lastSeenAt: {
              lt: cutoff,
            },
          },
        ],
      },
    });
  }
}
