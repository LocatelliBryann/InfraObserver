import { useCallback, useEffect, useState } from "react";

import {
  METRIC_PERIODS,
  type MetricPeriodKey,
} from "../config/metricPeriods";
import {
  DASHBOARD_REFRESH_INTERVAL_MS,
  LIVE_METRICS_REFRESH_INTERVAL_MS,
} from "../config/refresh";
import {
  getMetrics,
  type Metric,
} from "../services/metricsService";

interface UseMetricsResult {
  metrics: Metric[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useMetrics(
  endpointId: number | null,
  period: MetricPeriodKey = "live",
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
      const { durationMs, limit } = METRIC_PERIODS[period];

      const data =
        durationMs === null
          ? await getMetrics(endpointId)
          : await getMetrics(endpointId, limit, {
              from: new Date(Date.now() - durationMs),
            });

      setMetrics(data);
    } catch {
      setError("Não foi possível carregar as métricas.");
    } finally {
      setLoading(false);
    }
  }, [endpointId, period]);

  useEffect(() => {
    // Ao trocar endpoint ou período, não mostra o gráfico anterior.
    setMetrics([]);
    void refresh();

    if (endpointId === null) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refresh();
    }, period === "live"
      ? LIVE_METRICS_REFRESH_INTERVAL_MS
      : DASHBOARD_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [endpointId, period, refresh]);

  return {
    metrics,
    loading,
    error,
    refresh,
  };
}