import { prisma } from "../database/prisma";

export interface FileEventRepository {
  findEndpointByAgentId(agentId: string): Promise<{
    id: number;
    agentId: string;
  } | null>;

  create(data: {
    endpointId: number;
    username: string;
    eventType: string;
    filePath: string;
    occurredAt: Date;
    receivedAt: Date;
  }): Promise<{
    id: number;
    endpointId: number;
    username: string;
    eventType: string;
    filePath: string;
    occurredAt: Date;
    receivedAt: Date;
  }>;

  findRecent(limit: number): Promise<
    Array<{
      id: number;
      endpointId: number;
      username: string;
      eventType: string;
      filePath: string;
      occurredAt: Date;
      receivedAt: Date;
      endpoint: {
        hostname: string;
      };
    }>
  >;
}

export class PrismaFileEventRepository
  implements FileEventRepository
{
  async findEndpointByAgentId(agentId: string) {
    return prisma.endpoint.findUnique({
      where: {
        agentId,
      },
      select: {
        id: true,
        agentId: true,
      },
    });
  }

  async create(data: {
    endpointId: number;
    username: string;
    eventType: string;
    filePath: string;
    occurredAt: Date;
    receivedAt: Date;
  }) {
    return prisma.fileEvent.create({
      data,
    });
  }

  async findRecent(limit: number) {
    return prisma.fileEvent.findMany({
      take: limit,
      orderBy: {
        occurredAt: "desc",
      },
      include: {
        endpoint: {
          select: {
            hostname: true,
          },
        },
      },
    });
  }
}