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

// RF12: alertas já resolvidos, do mais recente para o mais antigo.
export async function getAlertHistory(limit = 50): Promise<Alert[]> {
  return apiClient.get<Alert[]>(
    `/api/v1/alerts?status=resolved&limit=${limit}`,
  );
}