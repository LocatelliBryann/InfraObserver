import type { AlertRepository } from "../repositories/alert.repository";

export interface EvaluateAlertInput {
  endpointId: number;
  metricId: number;
  metricType: string;
  metricValue: number;
  thresholdValue: number;
  severity: string;
}

export class AlertService {
  constructor(private readonly repository: AlertRepository) {}

  async findActive() {
    return this.repository.findActive();
  }

  async evaluate(input: EvaluateAlertInput) {
    if (input.metricValue <= input.thresholdValue) {
      const activeAlert =
        await this.repository.findActiveByEndpointAndMetricType(
          input.endpointId,
          input.metricType,
        );

      if (!activeAlert) {
        return null;
      }

      const consecutiveNormalCollections =
        await this.repository.countConsecutiveNormalCollections(
          input.endpointId,
          input.metricType,
          input.thresholdValue,
        );

      if (consecutiveNormalCollections < 2) {
        return activeAlert;
      }

      return this.repository.resolve(activeAlert.id, new Date());
    }

    const activeAlert =
      await this.repository.findActiveByEndpointAndMetricType(
        input.endpointId,
        input.metricType,
      );

    if (activeAlert) {
      return activeAlert;
    }

    return this.repository.create({
      endpointId: input.endpointId,
      metricId: input.metricId,
      metricType: input.metricType,
      thresholdValue: input.thresholdValue,
      severity: input.severity,
      triggeredAt: new Date(),
    });
  }
}