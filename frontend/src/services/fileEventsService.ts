import { apiClient } from "./apiClient";

export interface FileEvent {
  id: number;
  endpointId: number;
  username: string;
  eventType: string;
  filePath: string;
  occurredAt: string;
  receivedAt: string;
  endpoint: {
    hostname: string;
  };
}

export async function getRecentFileEvents(
  limit = 20,
): Promise<FileEvent[]> {
  return apiClient.get<FileEvent[]>(
    `/api/v1/file-events?limit=${limit}`,
  );
}