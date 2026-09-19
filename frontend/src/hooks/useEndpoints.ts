import { useEffect, useState } from "react";

import {
  endpointsService,
  type Endpoint,
} from "../services/endpointsService";

interface UseEndpointsResult {
  endpoints: Endpoint[];
  loading: boolean;
  error: string | null;
}

export function useEndpoints(): UseEndpointsResult {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEndpoints() {
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
    }

    void loadEndpoints();
  }, []);

  return {
    endpoints,
    loading,
    error,
  };
}