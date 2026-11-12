import { apiClient } from "./apiClient";
import { withClientFilter, type ClientFilter } from "./clientFilter";

export interface Endpoint {
  id: string;
  hostname: string;
  ipAddress?: string;
  operatingSystem?: string;
  osName?: string | null;
  osVersion?: string | null;
  // Versão do agente instalado; agentes antigos não informam.
  agentVersion?: string | null;
  status: string;
  lastSeenAt?: string | null;
  // Cliente dono do PC; nulo nos agentes que usam o token compartilhado.
  client?: { id: number; name: string } | null;
  // Quando o PC recebeu a credencial própria e quando o acesso foi revogado.
  credentialIssuedAt?: string | null;
  credentialRevokedAt?: string | null;
}

interface EndpointsResponse {
  data: Endpoint[];
}

export const endpointsService = {
  async getEndpoints(clientFilter?: ClientFilter): Promise<Endpoint[]> {
    const response = await apiClient.get<EndpointsResponse>(
      withClientFilter("/api/v1/endpoints", clientFilter),
    );

    return response.data;
  },

  // Corta o acesso do agente deste PC (o histórico continua no dashboard).
  async revokeEndpoint(id: number): Promise<Endpoint> {
    return apiClient.post<Endpoint>(`/api/v1/endpoints/${id}/revoke`);
  },
};