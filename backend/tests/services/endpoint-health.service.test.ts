import { describe, expect, it, vi } from "vitest";

import { EndpointHealthService } from "../../src/services/endpoint-health.service";

describe("EndpointHealthService", () => {
  it("deve considerar online um endpoint com métrica recente", async () => {
    const endpointService = {
      findAll: vi.fn().mockResolvedValue([
        {
          id: 1,
          agentId: "agent-1",
          hostname: "PC-001",
          ipAddress: "192.168.1.10",
          osName: "Windows",
          osVersion: "11",
          status: "ONLINE",
          lastSeenAt: new Date(),
        },
      ]),
    };

    const latestMetric = {
      id: 10,
      endpointId: 1,
      cpuPercent: 40,
      memoryUsed: 50,
      memoryTotal: 100,
      diskUsed: 30,
      diskTotal: 100,
      netBytesSent: BigInt(1000),
      netBytesRecv: BigInt(2000),
      collectedAt: new Date(),
    };

    const metricService = {
      findRecentByEndpointId: vi
        .fn()
        .mockResolvedValue([latestMetric]),
    };

    const service = new EndpointHealthService(
      endpointService,
      metricService,
    );

    const result = await service.findAll();

    expect(result).toEqual([
      {
        endpointId: 1,
        hostname: "PC-001",
        isOnline: true,
        isStale: false,
        latestMetric,
      },
    ]);

    expect(
      metricService.findRecentByEndpointId,
    ).toHaveBeenCalledWith(1, 1);
  });

  it("deve considerar offline um endpoint sem métrica recente", async () => {
    const endpointService = {
      findAll: vi.fn().mockResolvedValue([
        {
          id: 1,
          agentId: "agent-1",
          hostname: "PC-001",
          ipAddress: "192.168.1.10",
          osName: "Windows",
          osVersion: "11",
          status: "ONLINE",
          lastSeenAt: new Date(),
        },
      ]),
    };

    const staleMetric = {
      id: 10,
      endpointId: 1,
      cpuPercent: 40,
      memoryUsed: 50,
      memoryTotal: 100,
      diskUsed: 30,
      diskTotal: 100,
      netBytesSent: BigInt(1000),
      netBytesRecv: BigInt(2000),
      collectedAt: new Date(
        Date.now() - 6 * 60 * 1000,
      ),
    };

    const metricService = {
      findRecentByEndpointId: vi
        .fn()
        .mockResolvedValue([staleMetric]),
    };

    const service = new EndpointHealthService(
      endpointService,
      metricService,
    );

    const result = await service.findAll();

    expect(result[0]).toMatchObject({
      endpointId: 1,
      hostname: "PC-001",
      isOnline: false,
      isStale: true,
      latestMetric: staleMetric,
    });
  });

  it("deve considerar offline um endpoint sem métricas", async () => {
    const endpointService = {
      findAll: vi.fn().mockResolvedValue([
        {
          id: 1,
          agentId: "agent-1",
          hostname: "PC-001",
          ipAddress: "192.168.1.10",
          osName: "Windows",
          osVersion: "11",
          status: "ONLINE",
          lastSeenAt: new Date(),
        },
      ]),
    };

    const metricService = {
      findRecentByEndpointId: vi.fn().mockResolvedValue([]),
    };

    const service = new EndpointHealthService(
      endpointService,
      metricService,
    );

    const result = await service.findAll();

    expect(result[0]).toMatchObject({
      endpointId: 1,
      hostname: "PC-001",
      isOnline: false,
      isStale: true,
      latestMetric: null,
    });
  });

  it("deve avaliar todos os endpoints", async () => {
    const endpoints = [
      {
        id: 1,
        agentId: "agent-1",
        hostname: "PC-001",
        ipAddress: "192.168.1.10",
        osName: "Windows",
        osVersion: "11",
        status: "ONLINE",
        lastSeenAt: new Date(),
      },
      {
        id: 2,
        agentId: "agent-2",
        hostname: "PC-002",
        ipAddress: "192.168.1.11",
        osName: "Windows",
        osVersion: "11",
        status: "ONLINE",
        lastSeenAt: new Date(),
      },
    ];

    const endpointService = {
      findAll: vi.fn().mockResolvedValue(endpoints),
    };

    const metricService = {
      findRecentByEndpointId: vi
        .fn()
        .mockResolvedValue([]),
    };

    const service = new EndpointHealthService(
      endpointService,
      metricService,
    );

    const result = await service.findAll();

    expect(result).toHaveLength(2);
    expect(
      metricService.findRecentByEndpointId,
    ).toHaveBeenCalledTimes(2);
    expect(
      metricService.findRecentByEndpointId,
    ).toHaveBeenNthCalledWith(1, 1, 1);
    expect(
      metricService.findRecentByEndpointId,
    ).toHaveBeenNthCalledWith(2, 2, 1);
  });

  it("deve usar 3 ciclos de coleta como limite para considerar offline", async () => {
    const minutesAgo = (minutes: number) =>
      new Date(Date.now() - minutes * 60 * 1000);

    const endpointService = {
      findAll: vi.fn().mockResolvedValue([
        {
          id: 1,
          agentId: "agent-1",
          hostname: "PC-RECENTE",
          ipAddress: "192.168.1.10",
          osName: "Windows",
          osVersion: "11",
          status: "ONLINE",
          lastSeenAt: minutesAgo(2),
        },
        {
          id: 2,
          agentId: "agent-2",
          hostname: "PC-ATRASADO",
          ipAddress: "192.168.1.11",
          osName: "Windows",
          osVersion: "11",
          status: "ONLINE",
          lastSeenAt: minutesAgo(4),
        },
      ]),
    };

    const metricService = {
      findRecentByEndpointId: vi.fn(async (endpointId: number) => [
        {
          id: endpointId,
          endpointId,
          cpuPercent: 10,
          memoryUsed: 1,
          memoryTotal: 2,
          diskUsed: 1,
          diskTotal: 2,
          netBytesSent: BigInt(0),
          netBytesRecv: BigInt(0),
          collectedAt: endpointId === 1 ? minutesAgo(2) : minutesAgo(4),
        },
      ]),
    };

    const service = new EndpointHealthService(
      endpointService,
      metricService,
      () => 3 * 60 * 1000,
    );

    const result = await service.findAll();

    expect(result.map((item) => [item.hostname, item.isOnline])).toEqual([
      ["PC-RECENTE", true],
      ["PC-ATRASADO", false],
    ]);
  });
});
