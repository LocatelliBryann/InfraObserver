import { useCallback, useEffect, useState } from "react";

import { DASHBOARD_REFRESH_INTERVAL_MS } from "../config/refresh";

import {
  getRecentFileEvents,
  type FileEvent,
  type FileEventFilters,
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
  filters: FileEventFilters = { eventTypes: [], search: "" },
): UseFileEventsResult {
  const [fileEvents, setFileEvents] = useState<FileEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chaves estáveis: um objeto de filtros novo com o mesmo conteúdo não
  // dispara outra busca.
  const typesKey = filters.eventTypes.join(",");
  const search = filters.search.trim();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const activeFilters: FileEventFilters = {
        eventTypes: typesKey
          ? (typesKey.split(",") as FileEventFilters["eventTypes"])
          : [],
        search,
      };
      const hasFilters = typesKey !== "" || search !== "";

      let result: FileEvent[];

      if (hasFilters) {
        result = await getRecentFileEvents(
          limit,
          endpointId ?? undefined,
          activeFilters,
        );
      } else if (endpointId === null) {
        result = await getRecentFileEvents(limit);
      } else {
        result = await getRecentFileEvents(limit, endpointId);
      }
      setFileEvents(result);
    } catch {
      setError("Não foi possível carregar os eventos recentes.");
      setFileEvents([]);
    } finally {
      setLoading(false);
    }
  }, [limit, endpointId, typesKey, search]);

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