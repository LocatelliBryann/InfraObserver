import { useCallback, useEffect, useState } from "react";

import { DASHBOARD_REFRESH_INTERVAL_MS } from "../config/refresh";

import {
  getActiveAlerts,
  type Alert,
} from "../services/alertsService";
import type { ClientFilter } from "../services/clientFilter";


interface UseAlertsResult {
  alerts: Alert[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useAlerts(clientFilter?: ClientFilter): UseAlertsResult {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getActiveAlerts(clientFilter);
      setAlerts(result);
    } catch {
      setError("Não foi possível carregar os alertas.");
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [clientFilter]);

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
    alerts,
    loading,
    error,
    refresh,
  };
}