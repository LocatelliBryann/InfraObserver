import { prisma } from "../database/prisma";

export interface EndpointRepository {
  findByAgentId(agentId: string): Promise<{
    id: number;
    agentId: string;
    hostname: string;
    ipAddress: string;
    osName: string | null;
    osVersion: string | null;
    status: string;
    lastSeenAt: Date | null;
  } | null>;

  create(data: {
    agentId: string;
    hostname: string;
    ipAddress: string;
    osName?: string;
    osVersion?: string;
    status: string;
    lastSeenAt: Date;
  }): Promise<{
    id: number;
    agentId: string;
    hostname: string;
    ipAddress: string;
    osName: string | null;
    osVersion: string | null;
    status: string;
    lastSeenAt: Date | null;
  }>;

  update(
    id: number,
    data: {
      hostname?: string;
      ipAddress?: string;
      osName?: string;
      osVersion?: string;
      status?: string;
      lastSeenAt?: Date;
    },
  ): Promise<{
    id: number;
    agentId: string;
    hostname: string;
    ipAddress: string;
    osName: string | null;
    osVersion: string | null;
    status: string;
    lastSeenAt: Date | null;
  }>;
}

export class PrismaEndpointRepository implements EndpointRepository {
  async findByAgentId(agentId: string) {
    return prisma.endpoint.findUnique({
      where: {
        agentId,
      },
    });
  }

  async create(data: {
    agentId: string;
    hostname: string;
    ipAddress: string;
    osName?: string;
    osVersion?: string;
    status: string;
    lastSeenAt: Date;
  }) {
    return prisma.endpoint.create({
      data,
    });
  }

  async update(
    id: number,
    data: {
      hostname?: string;
      ipAddress?: string;
      osName?: string;
      osVersion?: string;
      status?: string;
      lastSeenAt?: Date;
    },
  ) {
    return prisma.endpoint.update({
      where: {
        id,
      },
      data,
    });
  }
}