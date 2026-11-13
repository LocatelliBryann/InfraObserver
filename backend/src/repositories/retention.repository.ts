import { prisma } from "../database/prisma";

export interface RetentionResult {
  metrics: number;
  fileEvents: number;
  alerts: number;
}

export interface RetentionRepository {
  deleteOlderThan(cutoff: Date): Promise<RetentionResult>;
}

export class PrismaRetentionRepository implements RetentionRepository {
  async deleteOlderThan(cutoff: Date): Promise<RetentionResult> {
    // Alertas abertos ficam, mesmo antigos: ainda descrevem o estado atual do PC.
    // Saem antes das métricas, que eles referenciam (a referência vira nula).
    const alerts = await prisma.alert.deleteMany({
      where: {
        triggeredAt: { lt: cutoff },
        resolvedAt: { not: null },
      },
    });

    const metrics = await prisma.metric.deleteMany({
      where: { collectedAt: { lt: cutoff } },
    });

    // Pela data em que o servidor recebeu: o relógio do PC pode estar errado.
    const fileEvents = await prisma.fileEvent.deleteMany({
      where: { receivedAt: { lt: cutoff } },
    });

    return {
      metrics: metrics.count,
      fileEvents: fileEvents.count,
      alerts: alerts.count,
    };
  }
}
