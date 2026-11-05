import { describe, expect, it, vi } from "vitest";

import { EndpointHealthService } from "../../src/services/endpoint-health.service";

const noActiveAlerts = {
  findActive: vi.fn().mockResolvedValue([]),
};

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
      noActiveAlerts,
    );

    const result = await service.findAll();

    expect(result).toEqual([
      {
        endpointId: 1,
        hostname: "PC-001",
        status: "ONLINE",
        activeAlerts: 0,
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
      noActiveAlerts,
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
      noActiveAlerts,
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
      noActiveAlerts,
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
      noActiveAlerts,
      () => 3 * 60 * 1000,
    );

    const result = await service.findAll();

    expect(result.map((item) => [item.hostname, item.isOnline])).toEqual([
      ["PC-RECENTE", true],
      ["PC-ATRASADO", false],
    ]);
  });

  describe("status do endpoint (RF06)", () => {
    const recentMetric = (endpointId: number) => ({
      id: endpointId,
      endpointId,
      cpuPercent: 95,
      memoryUsed: 1,
      memoryTotal: 2,
      diskUsed: 1,
      diskTotal: 2,
      netBytesSent: BigInt(0),
      netBytesRecv: BigInt(0),
      collectedAt: new Date(),
    });

    const endpoint = (id: number, hostname: string) => ({
      id,
      agentId: `agent-${id}`,
      hostname,
      ipAddress: "192.168.1.10",
      osName: "Windows",
      osVersion: "11",
      status: "ONLINE",
      lastSeenAt: new Date(),
    });

    const alert = (endpointId: number, metricType: string) => ({
      id: endpointId * 10,
      endpointId,
      metricId: null,
      metricType,
      thresholdValue: 80,
      severity: "HIGH",
      triggeredAt: new Date(),
      resolvedAt: null,
    });

    it("deve marcar como ALERT um endpoint online com alerta ativo", async () => {
      const service = new EndpointHealthService(
        { findAll: vi.fn().mockResolvedValue([endpoint(1, "PC-001")]) },
        {
          findRecentByEndpointId: vi
            .fn()
            .mockResolvedValue([recentMetric(1)]),
        },
        {
          findActive: vi
            .fn()
            .mockResolvedValue([alert(1, "CPU"), alert(1, "MEMORY")]),
        },
      );

      const [result] = await service.findAll();

      expect(result.status).toBe("ALERT");
      expect(result.activeAlerts).toBe(2);
    });

    it("deve priorizar OFFLINE sobre alertas de recurso", async () => {
      const service = new EndpointHealthService(
        { findAll: vi.fn().mockResolvedValue([endpoint(1, "PC-001")]) },
        { findRecentByEndpointId: vi.fn().mockResolvedValue([]) },
        { findActive: vi.fn().mockResolvedValue([alert(1, "CPU")]) },
      );

      const [result] = await service.findAll();

      expect(result.status).toBe("OFFLINE");
    });

    it("não deve contar o alerta OFFLINE como alerta de recurso", async () => {
      const service = new EndpointHealthService(
        { findAll: vi.fn().mockResolvedValue([endpoint(1, "PC-001")]) },
        {
          findRecentByEndpointId: vi
            .fn()
            .mockResolvedValue([recentMetric(1)]),
        },
        { findActive: vi.fn().mockResolvedValue([alert(1, "OFFLINE")]) },
      );

      const [result] = await service.findAll();

      expect(result.status).toBe("ONLINE");
      expect(result.activeAlerts).toBe(0);
    });

    it("deve contar alertas separadamente por endpoint", async () => {
      const service = new EndpointHealthService(
        {
          findAll: vi
            .fn()
            .mockResolvedValue([endpoint(1, "PC-001"), endpoint(2, "PC-002")]),
        },
        {
          findRecentByEndpointId: vi.fn(async (id: number) => [
            recentMetric(id),
          ]),
        },
        { findActive: vi.fn().mockResolvedValue([alert(2, "DISK")]) },
      );

      const result = await service.findAll();

      expect(result.map((item) => [item.hostname, item.status])).toEqual([
        ["PC-001", "ONLINE"],
        ["PC-002", "ALERT"],
      ]);
    });
  });
});
