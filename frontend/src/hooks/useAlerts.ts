import { useEffect, useState } from "react";

import {
  getActiveAlerts,
  type Alert,
} from "../services/alertsService";

const ALERTS_REFRESH_INTERVAL_MS = 60 * 1000;

interface UseAlertsResult {
  alerts: Alert[];
  loading: boolean;
  error: string | null;
}

export function useAlerts(): UseAlertsResult {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAlerts() {
      setLoading(true);
      setError(null);

      try {
        const result = await getActiveAlerts();

        if (!cancelled) {
          setAlerts(result);
        }
      } catch {
        if (!cancelled) {
          setError("Não foi possível carregar os alertas.");
          setAlerts([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAlerts();

    const intervalId = window.setInterval(() => {
      void loadAlerts();
    }, ALERTS_REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return {
    alerts,
    loading,
    error,
  };
}