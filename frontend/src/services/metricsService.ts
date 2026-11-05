
import { apiClient } from "./apiClient";

export interface Metric {
  id: number;
  endpointId: number;
  cpuPercent: number | null;
  memoryUsed: number | null;
  memoryTotal: number | null;
  diskUsed: number | null;
  diskTotal: number | null;
  netBytesSent: string | null;
  netBytesRecv: string | null;
  collectedAt: string;
}

export interface MetricPeriod {
  from?: Date;
  to?: Date;
}

export async function getMetrics(
  endpointId: number,
  limit = 20,
  period?: MetricPeriod,
): Promise<Metric[]> {
  const params = new URLSearchParams({
    endpointId: String(endpointId),
    limit: String(limit),
  });

  if (period?.from) {
    params.set("from", period.from.toISOString());
  }

  if (period?.to) {
    params.set("to", period.to.toISOString());
  }

  return apiClient.get<Metric[]>(`/api/v1/metrics?${params.toString()}`);
}