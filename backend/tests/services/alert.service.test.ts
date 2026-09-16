import { describe, expect, it, vi } from "vitest";

import { AlertService } from "../../src/services/alert.service";

describe("AlertService", () => {
  it("should create an alert when the metric exceeds the threshold", async () => {
    const repository = {
      findActiveByEndpointAndMetricType: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: 1,
        endpointId: 1,
        metricId: 10,
        metricType: "CPU",
        thresholdValue: 80,
        severity: "HIGH",
        triggeredAt: new Date("2026-09-15T22:00:00.000Z"),
        resolvedAt: null,
      }),
      resolve: vi.fn(),
    };

    const service = new AlertService(repository);

    const result = await service.evaluate({
      endpointId: 1,
      metricId: 10,
      metricType: "CPU",
      metricValue: 95,
      thresholdValue: 80,
      severity: "HIGH",
    });

    expect(repository.findActiveByEndpointAndMetricType).toHaveBeenCalledWith(
      1,
      "CPU",
    );

    expect(repository.create).toHaveBeenCalledWith({
      endpointId: 1,
      metricId: 10,
      metricType: "CPU",
      thresholdValue: 80,
      severity: "HIGH",
      triggeredAt: expect.any(Date),
    });

    expect(result).toBeDefined();
  });

  it("should not create a duplicate alert when an active alert already exists", async () => {
    const activeAlert = {
      id: 1,
      endpointId: 1,
      metricId: 10,
      metricType: "CPU",
      thresholdValue: 80,
      severity: "HIGH",
      triggeredAt: new Date("2026-09-15T22:00:00.000Z"),
      resolvedAt: null,
    };

    const repository = {
      findActiveByEndpointAndMetricType: vi
        .fn()
        .mockResolvedValue(activeAlert),
      create: vi.fn(),
    };

    const service = new AlertService(repository);

    const result = await service.evaluate({
      endpointId: 1,
      metricId: 11,
      metricType: "CPU",
      metricValue: 95,
      thresholdValue: 80,
      severity: "HIGH",
    });

    expect(repository.findActiveByEndpointAndMetricType).toHaveBeenCalledWith(
      1,
      "CPU",
    );

    expect(repository.create).not.toHaveBeenCalled();
    expect(result).toEqual(activeAlert);
  });

  it("should not create an alert when the metric is within the threshold", async () => {
  const repository = {
    findActiveByEndpointAndMetricType: vi.fn().mockResolvedValue(null),
    countConsecutiveNormalCollections: vi.fn(),
    create: vi.fn(),
    resolve: vi.fn(),
  };

  const service = new AlertService(repository);

  const result = await service.evaluate({
    endpointId: 1,
    metricId: 10,
    metricType: "CPU",
    metricValue: 70,
    thresholdValue: 80,
    severity: "HIGH",
  });

  expect(repository.findActiveByEndpointAndMetricType).toHaveBeenCalledWith(
    1,
    "CPU",
  );

  expect(repository.countConsecutiveNormalCollections).not.toHaveBeenCalled();
  expect(repository.create).not.toHaveBeenCalled();
  expect(repository.resolve).not.toHaveBeenCalled();
  expect(result).toBeNull();
  });

  it("should resolve an active alert after two consecutive normal collections", async () => {
  const activeAlert = {
    id: 1,
    endpointId: 1,
    metricId: 10,
    metricType: "CPU",
    thresholdValue: 80,
    severity: "HIGH",
    triggeredAt: new Date("2026-09-15T22:00:00.000Z"),
    resolvedAt: null,
  };

  const repository = {
    findActiveByEndpointAndMetricType: vi
      .fn()
      .mockResolvedValue(activeAlert),

    countConsecutiveNormalCollections: vi
      .fn()
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2),

    create: vi.fn(),
    resolve: vi.fn(),
  };

  const service = new AlertService(repository);

  await service.evaluate({
    endpointId: 1,
    metricId: 11,
    metricType: "CPU",
    metricValue: 70,
    thresholdValue: 80,
    severity: "HIGH",
  });

  expect(repository.resolve).not.toHaveBeenCalled();

  await service.evaluate({
    endpointId: 1,
    metricId: 12,
    metricType: "CPU",
    metricValue: 65,
    thresholdValue: 80,
    severity: "HIGH",
  });

  expect(repository.resolve).toHaveBeenCalledWith(
    activeAlert.id,
    expect.any(Date),
  );
});
});