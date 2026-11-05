import { useCallback, useEffect, useState } from "react";

import { DASHBOARD_REFRESH_INTERVAL_MS } from "../config/refresh";

import {
  endpointsService,
  type Endpoint,
} from "../services/endpointsService";

interface UseEndpointsResult {
  endpoints: Endpoint[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useEndpoints(): UseEndpointsResult {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await endpointsService.getEndpoints();
      setEndpoints(data);
    } catch {
      setError("Não foi possível carregar os endpoints.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();

    // Endpoints recém-registrados aparecem sem recarregar a página.
    const intervalId = window.setInterval(() => {
      void refresh();
    }, DASHBOARD_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [refresh]);

  return {
    endpoints,
    loading,
    error,
    refresh,
  };
}