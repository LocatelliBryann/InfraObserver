
import { useEffect, useState } from "react";

import { getMetrics, type Metric } from "../services/metricsService";
import type { Endpoint } from "../services/endpointsService";

const HEALTH_TIMEOUT_MS = 5 * 60 * 1000;
const HEALTH_REFRESH_INTERVAL_MS = 60 * 1000;

interface EndpointHealth {
  endpointId: number;
  latestMetric: Metric | null;
  isOnline: boolean;
  isStale: boolean;
}

interface UseEndpointHealthResult {
  health: EndpointHealth[];
  loading: boolean;
  error: string | null;
  onlineCount: number;
  unavailableCount: number;
  availability: number | null;
}

function isRecentMetric(metric: Metric | null): boolean {
  if (!metric) {
    return false;
  }

  const collectedAt = new Date(metric.collectedAt).getTime();

  if (Number.isNaN(collectedAt)) {
    return false;
  }

  return Date.now() - collectedAt <= HEALTH_TIMEOUT_MS;
}

export function useEndpointHealth(
  endpoints: Endpoint[],
): UseEndpointHealthResult {
  const [health, setHealth] = useState<EndpointHealth[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHealth() {
      if (endpoints.length === 0) {
        setHealth([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const results = await Promise.all(
          endpoints.map(async (endpoint) => {
            const endpointId = Number(endpoint.id);
            const metrics = await getMetrics(endpointId, 1);
            const latestMetric = metrics[0] ?? null;
            const isRecent = isRecentMetric(latestMetric);

            return {
              endpointId,
              latestMetric,
              isOnline: isRecent,
              isStale: !isRecent,
            };
          }),
        );

        if (!cancelled) {
          setHealth(results);
        }
      } catch {
        if (!cancelled) {
          setError("Não foi possível carregar a saúde dos endpoints.");
          setHealth([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadHealth();

    const intervalId = window.setInterval(() => {
      void loadHealth();
    }, HEALTH_REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [endpoints]);

  const onlineCount = health.filter((item) => item.isOnline).length;
  const unavailableCount = health.filter((item) => !item.isOnline).length;

  const availability =
    health.length > 0 ? (onlineCount / health.length) * 100 : null;

  return {
    health,
    loading,
    error,
    onlineCount,
    unavailableCount,
    availability,
  };
}