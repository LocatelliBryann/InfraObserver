import { useEffect, useState } from "react";

import {
  getRecentFileEvents,
  type FileEvent,
} from "../services/fileEventsService";

const FILE_EVENTS_REFRESH_INTERVAL_MS = 60 * 1000;

interface UseFileEventsResult {
  fileEvents: FileEvent[];
  loading: boolean;
  error: string | null;
}

export function useFileEvents(
  limit = 20,
): UseFileEventsResult {
  const [fileEvents, setFileEvents] = useState<FileEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFileEvents() {
      setLoading(true);
      setError(null);

      try {
        const result = await getRecentFileEvents(limit);

        if (!cancelled) {
          setFileEvents(result);
        }
      } catch {
        if (!cancelled) {
          setError(
            "Não foi possível carregar os eventos recentes.",
          );
          setFileEvents([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadFileEvents();

    const intervalId = window.setInterval(() => {
      void loadFileEvents();
    }, FILE_EVENTS_REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [limit]);

  return {
    fileEvents,
    loading,
    error,
  };
}