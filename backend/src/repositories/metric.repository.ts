
import { prisma } from "../database/prisma";

export interface MetricRepository {
  findEndpointByAgentId(agentId: string): Promise<{
    id: number;
    agentId: string;
  } | null>;

  create(data: {
    endpointId: number;
    cpuPercent?: number;
    memoryUsed?: number;
    memoryTotal?: number;
    diskUsed?: number;
    diskTotal?: number;
    netBytesSent?: bigint;
    netBytesRecv?: bigint;
    collectedAt: Date;
  }): Promise<{
    id: number;
    endpointId: number;
    cpuPercent: number | null;
    memoryUsed: number | null;
    memoryTotal: number | null;
    diskUsed: number | null;
    diskTotal: number | null;
    netBytesSent: bigint | null;
    netBytesRecv: bigint | null;
    collectedAt: Date;
  }>;

  findRecentByEndpointId(
    endpointId: number,
    limit: number,
  ): Promise<
    {
      id: number;
      endpointId: number;
      cpuPercent: number | null;
      memoryUsed: number | null;
      memoryTotal: number | null;
      diskUsed: number | null;
      diskTotal: number | null;
      netBytesSent: bigint | null;
      netBytesRecv: bigint | null;
      collectedAt: Date;
    }[]
  >;
}

export class PrismaMetricRepository implements MetricRepository {
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
    cpuPercent?: number;
    memoryUsed?: number;
    memoryTotal?: number;
    diskUsed?: number;
    diskTotal?: number;
    netBytesSent?: bigint;
    netBytesRecv?: bigint;
    collectedAt: Date;
  }) {
    return prisma.metric.create({
      data,
    });
  }

  async findRecentByEndpointId(endpointId: number, limit: number) {
    return prisma.metric.findMany({
      where: {
        endpointId,
      },
      orderBy: {
        collectedAt: "desc",
      },
      take: limit,
    });
  }
}