import { useCallback, useEffect, useState } from "react";

import { DASHBOARD_REFRESH_INTERVAL_MS } from "../config/refresh";
import {
  getAlertHistory,
  type Alert,
} from "../services/alertsService";

interface UseAlertHistoryResult {
  history: Alert[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// RF12: histórico de alertas resolvidos.
export function useAlertHistory(limit = 50): UseAlertHistoryResult {
  const [history, setHistory] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getAlertHistory(limit);
      setHistory(result);
    } catch {
      setError("Não foi possível carregar o histórico de alertas.");
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    void refresh();

    const intervalId = window.setInterval(() => {
      void refresh();
    }, DASHBOARD_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refresh]);

  return {
    history,
    loading,
    error,
    refresh,
  };
}
