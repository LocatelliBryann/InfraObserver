import { apiClient } from "./apiClient";

export type FileEventType = "CREATE" | "MODIFY" | "DELETE" | "RENAME" | "MOVE";

export const FILE_EVENT_TYPES: FileEventType[] = [
  "CREATE",
  "MODIFY",
  "DELETE",
  "RENAME",
  "MOVE",
];

export interface FileEvent {
  id: number;
  endpointId: number;
  username: string;
  eventType: FileEventType;
  filePath: string;
  // Caminho anterior, em renomeações e movimentações.
  previousPath?: string | null;
  isDirectory?: boolean;
  sourceIp?: string | null;
  // Programa que fez a ação (auditoria do Windows).
  processName?: string | null;
  // true: usuário confirmado pela auditoria do Windows; false: usuário com
  // sessão aberta no computador na hora do evento.
  audited?: boolean;
  occurredAt: string;
  receivedAt: string;
  endpoint: {
    hostname: string;
  };
}

export interface FileEventFilters {
  eventTypes: FileEventType[];
  search: string;
}

export const EMPTY_FILE_EVENT_FILTERS: FileEventFilters = {
  eventTypes: [],
  search: "",
};

export async function getRecentFileEvents(
  limit = 20,
  endpointId?: number,
  filters: FileEventFilters = EMPTY_FILE_EVENT_FILTERS,
): Promise<FileEvent[]> {
  const params = new URLSearchParams({
    limit: String(limit),
  });

  if (endpointId !== undefined) {
    params.set("endpointId", String(endpointId));
  }

  if (filters.eventTypes.length > 0) {
    params.set("eventType", filters.eventTypes.join(","));
  }

  const search = filters.search.trim();

  if (search) {
    params.set("search", search);
  }

  return apiClient.get<FileEvent[]>(
    `/api/v1/file-events?${params.toString()}`,
  );
}
