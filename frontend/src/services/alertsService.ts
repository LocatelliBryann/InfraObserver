import { apiClient } from "./apiClient";

export interface Alert {
  id: number;
  endpointId: number;
  metricId: number | null;
  metricType: string;
  thresholdValue: number;
  severity: string;
  triggeredAt: string;
  resolvedAt: string | null;
}

export async function getActiveAlerts(): Promise<Alert[]> {
  return apiClient.get<Alert[]>("/api/v1/alerts");
}