import type { MetricRepository } from "../repositories/metric.repository";
import type { CreateMetricInput } from "../utils/validation/metric.schema";
import type { AlertService } from "./alert.service";

const ALERT_THRESHOLDS = {
  CPU: {
    threshold: 80,
    severity: "HIGH",
  },
  MEMORY: {
    threshold: 80,
    severity: "HIGH",
  },
  DISK: {
    threshold: 90,
    severity: "CRITICAL",
  },
} as const;

export class MetricService {
  constructor(
    private readonly repository: MetricRepository,
    private readonly alertService: Pick<AlertService, "evaluate">,
  ) {}

  async create(input: CreateMetricInput) {
    const endpoint = await this.repository.findEndpointByAgentId(
      input.agentId,
    );

    if (!endpoint) {
      throw new Error("Endpoint not found");
    }

    const metric = await this.repository.create({
      endpointId: endpoint.id,
      cpuPercent: input.cpuPercent,
      memoryUsed: input.memoryUsed,
      memoryTotal: input.memoryTotal,
      diskUsed: input.diskUsed,
      diskTotal: input.diskTotal,
      netBytesSent: input.netBytesSent,
      netBytesRecv: input.netBytesRecv,
      collectedAt: input.collectedAt,
    });

    await this.evaluateAlerts({
      endpointId: endpoint.id,
      metricId: metric.id,
      input,
    });

    return metric;
  }

  async findRecentByEndpointId(endpointId: number, limit = 20) {
    return this.repository.findRecentByEndpointId(endpointId, limit);
  }

  private async evaluateAlerts({
    endpointId,
    metricId,
    input,
  }: {
    endpointId: number;
    metricId: number;
    input: CreateMetricInput;
  }) {
    if (input.cpuPercent !== undefined) {
      await this.alertService.evaluate({
        endpointId,
        metricId,
        metricType: "CPU",
        metricValue: input.cpuPercent,
        thresholdValue: ALERT_THRESHOLDS.CPU.threshold,
        severity: ALERT_THRESHOLDS.CPU.severity,
      });
    }

    if (
      input.memoryUsed !== undefined &&
      input.memoryTotal !== undefined &&
      input.memoryTotal > 0
    ) {
      const memoryUsage =
        (input.memoryUsed / input.memoryTotal) * 100;

      await this.alertService.evaluate({
        endpointId,
        metricId,
        metricType: "MEMORY",
        metricValue: memoryUsage,
        thresholdValue: ALERT_THRESHOLDS.MEMORY.threshold,
        severity: ALERT_THRESHOLDS.MEMORY.severity,
      });
    }

    if (
      input.diskUsed !== undefined &&
      input.diskTotal !== undefined &&
      input.diskTotal > 0
    ) {
      const diskUsage =
        (input.diskUsed / input.diskTotal) * 100;

      await this.alertService.evaluate({
        endpointId,
        metricId,
        metricType: "DISK",
        metricValue: diskUsage,
        thresholdValue: ALERT_THRESHOLDS.DISK.threshold,
        severity: ALERT_THRESHOLDS.DISK.severity,
      });
    }
  }
}