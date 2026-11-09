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
};