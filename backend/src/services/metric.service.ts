
import type { MetricRepository } from "../repositories/metric.repository";
import type { CreateMetricInput } from "../utils/validation/metric.schema";
import type { AlertService } from "./alert.service";

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

    if (input.cpuPercent !== undefined) {
      await this.alertService.evaluate({
        endpointId: endpoint.id,
        metricId: metric.id,
        metricType: "CPU",
        metricValue: input.cpuPercent,
        thresholdValue: 80,
        severity: "HIGH",
      });
    }

    return metric;
  }

  async findRecentByEndpointId(endpointId: number, limit = 20) {
    return this.repository.findRecentByEndpointId(endpointId, limit);
  }
}