import { useCallback, useEffect, useState } from "react";

import {
  getRecentFileEvents,
  type FileEvent,
} from "../services/fileEventsService";

const FILE_EVENTS_REFRESH_INTERVAL_MS = 60 * 1000;

interface UseFileEventsResult {
  fileEvents: FileEvent[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useFileEvents(
  limit = 20,
): UseFileEventsResult {
  const [fileEvents, setFileEvents] = useState<FileEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getRecentFileEvents(limit);
      setFileEvents(result);
    } catch {
      setError("Não foi possível carregar os eventos recentes.");
      setFileEvents([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void refresh();

    const intervalId = window.setInterval(() => {
      void refresh();
    }, FILE_EVENTS_REFRESH_INTERVAL_MS);

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