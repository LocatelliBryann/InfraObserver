import { describe, expect, it, vi } from "vitest";

import { MetricService } from "../../src/services/metric.service";

describe("MetricService", () => {
  it("should create a metric for an existing endpoint", async () => {
    const repository = {
      findEndpointByAgentId: vi.fn().mockResolvedValue({
        id: 1,
        agentId: "550e8400-e29b-41d4-a716-446655440000",
      }),
      create: vi.fn().mockResolvedValue({
        id: 1,
        endpointId: 1,
        cpuPercent: 35.5,
        memoryUsed: 4096,
        memoryTotal: 8192,
        diskUsed: 50000,
        diskTotal: 100000,
        netBytesSent: BigInt(1000),
        netBytesRecv: BigInt(2000),
        collectedAt: new Date(),
      }),
    };

    const service = new MetricService(repository);

    const input = {
      agentId: "550e8400-e29b-41d4-a716-446655440000",
      cpuPercent: 35.5,
      memoryUsed: 4096,
      memoryTotal: 8192,
      diskUsed: 50000,
      diskTotal: 100000,
      netBytesSent: BigInt(1000),
      netBytesRecv: BigInt(2000),
      collectedAt: new Date(),
    };

    const result = await service.create(input);

    expect(repository.findEndpointByAgentId).toHaveBeenCalledWith(
      input.agentId,
    );

    expect(repository.create).toHaveBeenCalledWith({
      endpointId: 1,
      cpuPercent: input.cpuPercent,
      memoryUsed: input.memoryUsed,
      memoryTotal: input.memoryTotal,
      diskUsed: input.diskUsed,
      diskTotal: input.diskTotal,
      netBytesSent: input.netBytesSent,
      netBytesRecv: input.netBytesRecv,
      collectedAt: input.collectedAt,
    });

    expect(result).toBeDefined();
  });
});