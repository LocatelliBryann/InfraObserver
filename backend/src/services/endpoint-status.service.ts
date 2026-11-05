import { getOfflineThresholdMs } from "../config/monitoring";
import type { AlertRepository } from "../repositories/alert.repository";
import type { EndpointRepository } from "../repositories/endpoint.repository";

export const ENDPOINT_STATUS = {
  ONLINE: "ONLINE",
  OFFLINE: "OFFLINE",
} as const;

export const OFFLINE_ALERT = {
  metricType: "OFFLINE",
  severity: "CRITICAL",
} as const;

export class EndpointStatusService {
  constructor(
    private readonly endpointRepository: Pick<
      EndpointRepository,
      "findOnlineNotSeenSince" | "update"
    >,
    private readonly alertRepository: Pick<
      AlertRepository,
      "findActiveByEndpointAndMetricType" | "create" | "resolve"
    >,
    private readonly offlineThresholdMs: () => number = getOfflineThresholdMs,
  ) {}

  /**
   * RF16 / RN09: ao receber dados do agente, o endpoint volta a ficar
   * ONLINE e o alerta de indisponibilidade, se houver, é resolvido.
   */
  async markOnline(endpointId: number, seenAt: Date = new Date()) {
    const endpoint = await this.endpointRepository.update(endpointId, {
      status: ENDPOINT_STATUS.ONLINE,
      lastSeenAt: seenAt,
    });

    const offlineAlert =
      await this.alertRepository.findActiveByEndpointAndMetricType(
        endpointId,
        OFFLINE_ALERT.metricType,
      );

    if (offlineAlert) {
      await this.alertRepository.resolve(offlineAlert.id, seenAt);
    }

    return endpoint;
  }

  /**
   * RF04 / RN02: marca como OFFLINE os endpoints que estão há mais de
   * 3 ciclos de coleta sem enviar dados e abre um alerta para cada um.
   */
  async detectOfflineEndpoints(now: Date = new Date()) {
    const thresholdMs = this.offlineThresholdMs();
    const cutoff = new Date(now.getTime() - thresholdMs);

    const staleEndpoints =
      await this.endpointRepository.findOnlineNotSeenSince(cutoff);

    for (const endpoint of staleEndpoints) {
      await this.endpointRepository.update(endpoint.id, {
        status: ENDPOINT_STATUS.OFFLINE,
      });

      const activeAlert =
        await this.alertRepository.findActiveByEndpointAndMetricType(
          endpoint.id,
          OFFLINE_ALERT.metricType,
        );

      if (!activeAlert) {
        await this.alertRepository.create({
          endpointId: endpoint.id,
          metricId: null,
          metricType: OFFLINE_ALERT.metricType,
          thresholdValue: thresholdMs / 1000,
          severity: OFFLINE_ALERT.severity,
          triggeredAt: now,
        });
      }
    }

    return staleEndpoints;
  }
}
