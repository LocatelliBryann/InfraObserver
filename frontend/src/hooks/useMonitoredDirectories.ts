import { useCallback, useEffect, useState } from "react";

import {
  monitoredDirectoriesService,
  type EndpointDirectoriesInput,
  type MonitoredDirectories,
} from "../services/monitoredDirectoriesService";

// Enquanto o agente não aplica a mudança, confere de novo a cada 15 s.
export const PENDING_REFRESH_INTERVAL_MS = 15_000;

interface UseMonitoredDirectoriesResult {
  directories: MonitoredDirectories | null;
  loading: boolean;
  error: string | null;
  save: (input: EndpointDirectoriesInput) => Promise<void>;
}

export function useMonitoredDirectories(
  endpointId: number | null,
): UseMonitoredDirectoriesResult {
  const [directories, setDirectories] = useState<MonitoredDirectories | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (showLoading: boolean) => {
      if (endpointId === null) {
        setDirectories(null);
        return;
      }

      if (showLoading) {
        setLoading(true);
      }

      try {
        setDirectories(await monitoredDirectoriesService.get(endpointId));
        setError(null);
      } catch {
        setError("Não foi possível carregar as pastas monitoradas.");
      } finally {
        setLoading(false);
      }
    },
    [endpointId],
  );

  useEffect(() => {
    setDirectories(null);
    void load(true);
  }, [load]);

  const pending = directories?.pending ?? false;

  useEffect(() => {
    if (!pending) {
      return;
    }

    const timer = setInterval(() => {
      void load(false);
    }, PENDING_REFRESH_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [pending, load]);

  const save = useCallback(
    async (input: EndpointDirectoriesInput) => {
      if (endpointId === null) {
        return;
      }

      // O erro sobe para o painel, que mostra a mensagem perto do botão.
      setDirectories(await monitoredDirectoriesService.save(endpointId, input));
    },
    [endpointId],
  );

  return { directories, loading, error, save };
}
