import { useCallback, useEffect, useState } from "react";

import { DASHBOARD_REFRESH_INTERVAL_MS } from "../config/refresh";

import {
  getRecentFileEvents,
  type FileEvent,
} from "../services/fileEventsService";


interface UseFileEventsResult {
  fileEvents: FileEvent[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// endpointId nulo ou indefinido lista os eventos de todos os endpoints.
export function useFileEvents(
  limit = 20,
  endpointId: number | null = null,
): UseFileEventsResult {
  const [fileEvents, setFileEvents] = useState<FileEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result =
        endpointId === null
          ? await getRecentFileEvents(limit)
          : await getRecentFileEvents(limit, endpointId);
      setFileEvents(result);
    } catch {
      setError("Não foi possível carregar os eventos recentes.");
      setFileEvents([]);
    } finally {
      setLoading(false);
    }
  }, [limit, endpointId]);

  useEffect(() => {
    // Ao trocar de endpoint, não mostra eventos do endpoint anterior.
    setFileEvents([]);
    void refresh();

    const intervalId = window.setInterval(() => {
      void refresh();
    }, DASHBOARD_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refresh]);

  return {
    fileEvents,
    loading,
    error,
    refresh,
  };
}