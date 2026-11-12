import { apiClient } from "./apiClient";

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
  async getEndpoints(): Promise<Endpoint[]> {
    const response = await apiClient.get<EndpointsResponse>(
      "/api/v1/endpoints",
    );

    return response.data;
  },

  // Corta o acesso do agente deste PC (o histórico continua no dashboard).
  async revokeEndpoint(id: number): Promise<Endpoint> {
    return apiClient.post<Endpoint>(`/api/v1/endpoints/${id}/revoke`);
  },
};