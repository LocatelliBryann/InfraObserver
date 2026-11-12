import { apiClient } from "./apiClient";
import { withClientFilter, type ClientFilter } from "./clientFilter";

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

export async function getActiveAlerts(
  clientFilter?: ClientFilter,
): Promise<Alert[]> {
  return apiClient.get<Alert[]>(withClientFilter("/api/v1/alerts", clientFilter));
}

// RF12: alertas já resolvidos, do mais recente para o mais antigo.
export async function getAlertHistory(
  limit = 50,
  clientFilter?: ClientFilter,
): Promise<Alert[]> {
  return apiClient.get<Alert[]>(
    withClientFilter(`/api/v1/alerts?status=resolved&limit=${limit}`, clientFilter),
  );
}