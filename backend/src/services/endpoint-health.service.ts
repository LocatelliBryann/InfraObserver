import { getOfflineThresholdMs } from "../config/monitoring";
import type { EndpointService } from "./endpoint.service";
import type { MetricService } from "./metric.service";

export interface EndpointHealth {
  endpointId: number;
  hostname: string;
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
    private readonly offlineThresholdMs: () => number = getOfflineThresholdMs,
  ) {}

  async findAll(): Promise<EndpointHealth[]> {
    const endpoints = await this.endpointService.findAll();

    return Promise.all(
      endpoints.map(async (endpoint) => {
        const metrics =
          await this.metricService.findRecentByEndpointId(
            endpoint.id,
            1,
          );

        const latestMetric = metrics[0] ?? null;
        const isOnline = this.isRecentMetric(latestMetric);

        return {
          endpointId: endpoint.id,  
          hostname: endpoint.hostname,
          isOnline,
          isStale: !isOnline,
          latestMetric,
        };
      }),
    );
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