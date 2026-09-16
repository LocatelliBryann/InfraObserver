import { prisma } from "../database/prisma";

export interface AlertRepository {
  findActiveByEndpointAndMetricType(
    endpointId: number,
    metricType: string,
  ): Promise<{
    id: number;
    endpointId: number;
    metricId: number | null;
    metricType: string;
    thresholdValue: number;
    severity: string;
    triggeredAt: Date;
    resolvedAt: Date | null;
  } | null>;

  countConsecutiveNormalCollections(
    endpointId: number,
    metricType: string,
    thresholdValue: number,
  ): Promise<number>;

  create(data: {
    endpointId: number;
    metricId: number;
    metricType: string;
    thresholdValue: number;
    severity: string;
    triggeredAt: Date;
  }): Promise<{
    id: number;
    endpointId: number;
    metricId: number | null;
    metricType: string;
    thresholdValue: number;
    severity: string;
    triggeredAt: Date;
    resolvedAt: Date | null;
  }>;

  resolve(
    id: number,
    resolvedAt: Date,
  ): Promise<{
    id: number;
    endpointId: number;
    metricId: number | null;
    metricType: string;
    thresholdValue: number;
    severity: string;
    triggeredAt: Date;
    resolvedAt: Date | null;
  }>;
}

export class PrismaAlertRepository implements AlertRepository {
  async findActiveByEndpointAndMetricType(
    endpointId: number,
    metricType: string,
  ) {
    return prisma.alert.findFirst({
      where: {
        endpointId,
        metricType,
        resolvedAt: null,
      },
      orderBy: {
        triggeredAt: "desc",
      },
    });
  }

  async countConsecutiveNormalCollections(
  endpointId: number,
  metricType: string,
  thresholdValue: number,
): Promise<number> {
  const metrics = await prisma.metric.findMany({
    where: {
      endpointId,
    },
    orderBy: {
      collectedAt: "desc",
    },
    take: 100,
    select: {
      cpuPercent: true,
      memoryUsed: true,
      memoryTotal: true,
      diskUsed: true,
      diskTotal: true,
      netBytesSent: true,
      netBytesRecv: true,
    },
  });

  let consecutiveNormalCollections = 0;

  for (const metric of metrics) {
    let metricValue: number | null = null;

    switch (metricType) {
      case "CPU":
        metricValue = metric.cpuPercent;
        break;

      case "MEMORY":
        if (metric.memoryUsed !== null && metric.memoryTotal !== null) {
          metricValue = (metric.memoryUsed / metric.memoryTotal) * 100;
        }
        break;

      case "DISK":
        if (metric.diskUsed !== null && metric.diskTotal !== null) {
          metricValue = (metric.diskUsed / metric.diskTotal) * 100;
        }
        break;

      case "NETWORK":
        if (
          metric.netBytesSent !== null &&
          metric.netBytesRecv !== null
        ) {
          metricValue =
            Number(metric.netBytesSent) + Number(metric.netBytesRecv);
        }
        break;

      default:
        throw new Error(`Unsupported metric type: ${metricType}`);
    }

    if (metricValue === null || metricValue > thresholdValue) {
      break;
    }

    consecutiveNormalCollections++;
  }

  return consecutiveNormalCollections;
  }

  async create(data: {
    endpointId: number;
    metricId: number;
    metricType: string;
    thresholdValue: number;
    severity: string;
    triggeredAt: Date;
  }) {
    return prisma.alert.create({
      data,
    });
  }

  async resolve(id: number, resolvedAt: Date) {
    return prisma.alert.update({
      where: {
        id,
      },
      data: {
        resolvedAt,
      },
    });
  }
}