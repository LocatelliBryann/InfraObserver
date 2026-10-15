import { apiClient } from "./apiClient";
import type { Metric } from "./metricsService";

export interface EndpointHealth {
  endpointId: number;
  hostname: string;
  isOnline: boolean;
  isStale: boolean;
  latestMetric: Metric | null;
}

interface EndpointHealthResponse {
  data: EndpointHealth[];
}

export async function getEndpointHealth(): Promise<EndpointHealth[]> {
  const response = await apiClient.get<EndpointHealthResponse>(
    "/api/v1/endpoints/health",
  );

  return response.data;
}