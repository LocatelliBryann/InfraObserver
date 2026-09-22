import { useEffect, useState } from "react";

import {
  getMetrics,
  type Metric,
} from "../services/metricsService";

const METRICS_REFRESH_INTERVAL_MS = 10 * 1000;

interface UseMetricsResult {
  metrics: Metric[];
  loading: boolean;
  error: string | null;
}

export function useMetrics(
  endpointId: number | null,
): UseMetricsResult {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (endpointId === null) {
      setMetrics([]);
      setLoading(false);
      setError(null);
      return;
    }

    const selectedEndpointId = endpointId;
    let cancelled = false;

    async function loadMetrics() {
      setLoading(true);
      setError(null);

      try {
        const data = await getMetrics(selectedEndpointId);

        if (!cancelled) {
          setMetrics(data);
        }
      } catch {
        if (!cancelled) {
          setError("Não foi possível carregar as métricas.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadMetrics();

    const intervalId = window.setInterval(() => {
      void loadMetrics();
    }, METRICS_REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [endpointId]);

  return {
    metrics,
    loading,
    error,
  };
}