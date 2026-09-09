import type { MetricRepository } from "../repositories/metric.repository";
import type { CreateMetricInput } from "../utils/validation/metric.schema";

export class MetricService {
  constructor(private readonly repository: MetricRepository) {}

  async create(input: CreateMetricInput) {
    const endpoint = await this.repository.findEndpointByAgentId(
      input.agentId,
    );

    if (!endpoint) {
      throw new Error("Endpoint not found");
    }

    return this.repository.create({
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
  }
}