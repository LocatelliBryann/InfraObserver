import { useCallback, useEffect, useState } from "react";

import {
  getEndpointHealth,
  type EndpointHealth,
} from "../services/endpointHealthService";

import type { Endpoint } from "../services/endpointsService";

const HEALTH_REFRESH_INTERVAL_MS = 60 * 1000;

interface UseEndpointHealthResult {
  health: EndpointHealth[];
  loading: boolean;
  error: string | null;
  onlineCount: number;
  unavailableCount: number;
  availability: number | null;
}

export function useEndpointHealth(
  endpoints: Endpoint[],
): UseEndpointHealthResult {
  const [health, setHealth] = useState<EndpointHealth[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasEndpoints = endpoints.length > 0;

  const refresh = useCallback(async () => {
    if (!hasEndpoints) {
      setHealth([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getEndpointHealth();
      setHealth(result);
    } catch {
      setError("Não foi possível carregar a saúde dos endpoints.");
      setHealth([]);
    } finally {
      setLoading(false);
    }
  }, [hasEndpoints]);

  useEffect(() => {
    void refresh();

    if (!hasEndpoints) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refresh();
    }, HEALTH_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasEndpoints, refresh]);

  const onlineCount = health.filter((item) => item.isOnline).length;
  const unavailableCount = health.filter((item) => !item.isOnline).length;

  const availability =
    health.length > 0
      ? (onlineCount / health.length) * 100
      : null;

  return {
    health,
    loading,
    error,
    onlineCount,
    unavailableCount,
    availability,
  };
}