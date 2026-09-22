import { useCallback, useEffect, useState } from "react";

import {
  getActiveAlerts,
  type Alert,
} from "../services/alertsService";

const ALERTS_REFRESH_INTERVAL_MS = 60 * 1000;

interface UseAlertsResult {
  alerts: Alert[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAlerts(): UseAlertsResult {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getActiveAlerts();
      setAlerts(result);
    } catch {
      setError("Não foi possível carregar os alertas.");
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    const intervalId = window.setInterval(() => {
      void refresh();
    }, ALERTS_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refresh]);

  return {
    alerts,
    loading,
    error,
    refresh,
  };
}