import { describe, expect, it, vi } from "vitest";

import { EndpointStatusService } from "../../src/services/endpoint-status.service";

const THRESHOLD_MS = 180_000;

function buildEndpoint(overrides: Partial<{
  id: number;
  status: string;
  lastSeenAt: Date | null;
}> = {}) {
  return {
    id: 1,
    agentId: "550e8400-e29b-41d4-a716-446655440000",
    hostname: "PC-001",
    ipAddress: "192.168.1.10",
    osName: "Windows",
    osVersion: "11",
    status: "ONLINE",
    lastSeenAt: new Date(),
    ...overrides,
  };
}

function buildAlert(overrides: Partial<{ id: number }> = {}) {
  return {
    id: 99,
    endpointId: 1,
    metricId: null,
    metricType: "OFFLINE",
    thresholdValue: 180,
    severity: "CRITICAL",
    triggeredAt: new Date(),
    resolvedAt: null,
    ...overrides,
  };
}

function buildDependencies() {
  const endpointRepository = {
    findOnlineNotSeenSince: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(buildEndpoint()),
  };

  const alertRepository = {
    findActiveByEndpointAndMetricType: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(buildAlert()),
    resolve: vi.fn().mockResolvedValue(buildAlert()),
  };

  const service = new EndpointStatusService(
    endpointRepository,
    alertRepository,
    () => THRESHOLD_MS,
  );

  return { endpointRepository, alertRepository, service };
}

describe("EndpointStatusService", () => {
  describe("detectOfflineEndpoints", () => {
    it("should search for endpoints not seen within 3 collection cycles", async () => {
      const { endpointRepository, service } = buildDependencies();
      const now = new Date("2026-11-05T12:00:00.000Z");

      await service.detectOfflineEndpoints(now);

      expect(endpointRepository.findOnlineNotSeenSince).toHaveBeenCalledWith(
        new Date("2026-11-05T11:57:00.000Z"),
      );
    });

    it("should mark stale endpoints as OFFLINE and open an alert", async () => {
      const { endpointRepository, alertRepository, service } =
        buildDependencies();
      const now = new Date("2026-11-05T12:00:00.000Z");
      const staleEndpoint = buildEndpoint({
        id: 7,
        lastSeenAt: new Date("2026-11-05T11:50:00.000Z"),
      });

      endpointRepository.findOnlineNotSeenSince.mockResolvedValue([
        staleEndpoint,
      ]);

      const result = await service.detectOfflineEndpoints(now);

      expect(result).toEqual([staleEndpoint]);
      expect(endpointRepository.update).toHaveBeenCalledWith(7, {
        status: "OFFLINE",
      });
      expect(alertRepository.create).toHaveBeenCalledWith({
        endpointId: 7,
        metricId: null,
        metricType: "OFFLINE",
        thresholdValue: 180,
        severity: "CRITICAL",
        triggeredAt: now,
      });
    });

    it("should not duplicate an OFFLINE alert that is still active", async () => {
      const { endpointRepository, alertRepository, service } =
        buildDependencies();

      endpointRepository.findOnlineNotSeenSince.mockResolvedValue([
        buildEndpoint({ id: 7 }),
      ]);
      alertRepository.findActiveByEndpointAndMetricType.mockResolvedValue(
        buildAlert({ id: 50 }),
      );

      await service.detectOfflineEndpoints();

      expect(endpointRepository.update).toHaveBeenCalledWith(7, {
        status: "OFFLINE",
      });
      expect(alertRepository.create).not.toHaveBeenCalled();
    });

    it("should do nothing when every endpoint is reporting", async () => {
      const { endpointRepository, alertRepository, service } =
        buildDependencies();

      const result = await service.detectOfflineEndpoints();

      expect(result).toEqual([]);
      expect(endpointRepository.update).not.toHaveBeenCalled();
      expect(alertRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("markOnline", () => {
    it("should set the endpoint ONLINE and refresh lastSeenAt", async () => {
      const { endpointRepository, alertRepository, service } =
        buildDependencies();
      const seenAt = new Date("2026-11-05T12:00:00.000Z");

      await service.markOnline(1, seenAt);

      expect(endpointRepository.update).toHaveBeenCalledWith(1, {
        status: "ONLINE",
        lastSeenAt: seenAt,
      });
      expect(alertRepository.resolve).not.toHaveBeenCalled();
    });

    it("should resolve the active OFFLINE alert when the endpoint returns", async () => {
      const { alertRepository, service } = buildDependencies();
      const seenAt = new Date("2026-11-05T12:00:00.000Z");

      alertRepository.findActiveByEndpointAndMetricType.mockResolvedValue(
        buildAlert({ id: 99 }),
      );

      await service.markOnline(1, seenAt);

      expect(
        alertRepository.findActiveByEndpointAndMetricType,
      ).toHaveBeenCalledWith(1, "OFFLINE");
      expect(alertRepository.resolve).toHaveBeenCalledWith(99, seenAt);
    });
  });
});
