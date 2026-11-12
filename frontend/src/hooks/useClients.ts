import { useCallback, useEffect, useState } from "react";

import { ApiError } from "../services/apiClient";
import { clientsService, type Client } from "../services/clientsService";

interface UseClientsResult {
  clients: Client[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createClient: (name: string) => Promise<Client>;
}

export function describeClientError(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    return "Já existe um cliente com esse nome.";
  }

  if (error instanceof ApiError && error.status === 400) {
    return "Informe um nome entre 2 e 100 caracteres.";
  }

  return "Não foi possível salvar. Tente de novo.";
}

export function useClients(): UseClientsResult {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setClients(await clientsService.getClients());
    } catch {
      setError("Não foi possível carregar os clientes.");
    } finally {
      setLoading(false);
    }
  }, []);

  const createClient = useCallback(
    async (name: string) => {
      const client = await clientsService.createClient(name);

      await refresh();

      return client;
    },
    [refresh],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { clients, loading, error, refresh, createClient };
}
