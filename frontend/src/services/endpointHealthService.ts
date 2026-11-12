import { apiClient } from "./apiClient";
import { withClientFilter, type ClientFilter } from "./clientFilter";
import type { Metric } from "./metricsService";

export type EndpointStatus = "ONLINE" | "OFFLINE" | "ALERT";

export interface EndpointHealth {
  endpointId: number;
  hostname: string;
  status: EndpointStatus;
  activeAlerts: number;
  isOnline: boolean;
  isStale: boolean;
  latestMetric: Metric | null;
}

interface EndpointHealthResponse {
  data: EndpointHealth[];
}

export async function getEndpointHealth(
  clientFilter?: ClientFilter,
): Promise<EndpointHealth[]> {
  const response = await apiClient.get<EndpointHealthResponse>(
    withClientFilter("/api/v1/endpoints/health", clientFilter),
  );

  return response.data;
}