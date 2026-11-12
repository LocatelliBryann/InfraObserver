import { getOfflineThresholdMs } from "../config/monitoring";
import type { AlertService } from "./alert.service";
import type { EndpointService } from "./endpoint.service";
import { OFFLINE_ALERT } from "./endpoint-status.service";
import type { MetricService } from "./metric.service";
import type { ClientFilter } from "../utils/validation/query.schema";

// RF06: status exibido no dashboard para cada endpoint.
export type EndpointHealthStatus = "ONLINE" | "OFFLINE" | "ALERT";

export interface EndpointHealth {
  endpointId: number;
  hostname: string;
  status: EndpointHealthStatus;
  activeAlerts: number;
  isOnline: boolean;
  isStale: boolean;
  latestMetric: Awaited<
    ReturnType<MetricService["findRecentByEndpointId"]>
  >[number] | null;
}

export class EndpointHealthService {
  constructor(
    private readonly endpointService: Pick<
      EndpointService,
      "findAll"
    >,
    private readonly metricService: Pick<
      MetricService,
      "findRecentByEndpointId"
    >,
    private readonly alertService: Pick<AlertService, "findActive">,
    private readonly offlineThresholdMs: () => number = getOfflineThresholdMs,
  ) {}

  async findAll(clientId?: ClientFilter): Promise<EndpointHealth[]> {
    const endpoints = await this.endpointService.findAll(clientId);
    const activeAlertsByEndpoint = await this.countActiveAlerts();

    return Promise.all(
      endpoints.map(async (endpoint) => {
        const metrics =
          await this.metricService.findRecentByEndpointId(
            endpoint.id,
            1,
          );

        const latestMetric = metrics[0] ?? null;
        const isOnline = this.isRecentMetric(latestMetric);
        const activeAlerts =
          activeAlertsByEndpoint.get(endpoint.id) ?? 0;

        return {
          endpointId: endpoint.id,
          hostname: endpoint.hostname,
          status: this.resolveStatus(isOnline, activeAlerts),
          activeAlerts,
          isOnline,
          isStale: !isOnline,
          latestMetric,
        };
      }),
    );
  }

  private resolveStatus(
    isOnline: boolean,
    activeAlerts: number,
  ): EndpointHealthStatus {
    if (!isOnline) {
      return "OFFLINE";
    }

    return activeAlerts > 0 ? "ALERT" : "ONLINE";
  }

  // Conta alertas de recurso (CPU, memória, disco) ativos por endpoint.
  // O alerta de indisponibilidade já é representado pelo status OFFLINE.
  private async countActiveAlerts(): Promise<Map<number, number>> {
    const alerts = await this.alertService.findActive();
    const counts = new Map<number, number>();

    for (const alert of alerts) {
      if (alert.metricType === OFFLINE_ALERT.metricType) {
        continue;
      }

      counts.set(alert.endpointId, (counts.get(alert.endpointId) ?? 0) + 1);
    }

    return counts;
  }

  private isRecentMetric(
    metric: EndpointHealth["latestMetric"],
  ): boolean {
    if (!metric) {
      return false;
    }

    const collectedAt = metric.collectedAt.getTime();

    if (Number.isNaN(collectedAt)) {
      return false;
    }

    return Date.now() - collectedAt <= this.offlineThresholdMs();
  }
}