
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

export async function getMetrics(
  endpointId: number,
  limit = 20,
): Promise<Metric[]> {
  return apiClient.get<Metric[]>(
    `/api/v1/metrics?endpointId=${endpointId}&limit=${limit}`,
  );
}