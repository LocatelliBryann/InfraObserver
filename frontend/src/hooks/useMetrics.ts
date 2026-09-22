import { useCallback, useEffect, useState } from "react";

import {
  getMetrics,
  type Metric,
} from "../services/metricsService";

const METRICS_REFRESH_INTERVAL_MS = 10 * 1000;

interface UseMetricsResult {
  metrics: Metric[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useMetrics(
  endpointId: number | null,
): UseMetricsResult {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (endpointId === null) {
      setMetrics([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getMetrics(endpointId);
      setMetrics(data);
    } catch {
      setError("Não foi possível carregar as métricas.");
    } finally {
      setLoading(false);
    }
  }, [endpointId]);

  useEffect(() => {
    void refresh();

    if (endpointId === null) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refresh();
    }, METRICS_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [endpointId, refresh]);

  return {
    metrics,
    loading,
    error,
    refresh,
  };
}