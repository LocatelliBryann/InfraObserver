import { apiClient } from "./apiClient";

export interface Client {
  id: number;
  name: string;
  createdAt: string;
  endpointCount: number;
  activeTokenCount: number;
}

export interface EnrollmentToken {
  id: number;
  clientId: number;
  // Começo do token, para reconhecer na lista (o resto não fica salvo).
  prefix: string;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  usageCount: number;
  // Se o token pode ser copiado de novo (ativo e gerado a partir da v1.8.0).
  revealable: boolean;
}

export interface CreatedEnrollmentToken {
  // Token completo: aparece só nesta resposta.
  token: string;
  enrollmentToken: EnrollmentToken;
}

interface ListResponse<T> {
  data: T[];
}

export type EnrollmentTokenStatus = "active" | "revoked" | "expired";

export function enrollmentTokenStatus(
  token: Pick<EnrollmentToken, "revokedAt" | "expiresAt">,
  now: Date = new Date(),
): EnrollmentTokenStatus {
  if (token.revokedAt) {
    return "revoked";
  }

  if (token.expiresAt && new Date(token.expiresAt) <= now) {
    return "expired";
  }

  return "active";
}

export const clientsService = {
  async getClients(): Promise<Client[]> {
    const response = await apiClient.get<ListResponse<Client>>("/api/v1/clients");

    return response.data;
  },

  async createClient(name: string): Promise<Client> {
    return apiClient.post<Client>("/api/v1/clients", { name });
  },

  async getEnrollmentTokens(clientId: number): Promise<EnrollmentToken[]> {
    const response = await apiClient.get<ListResponse<EnrollmentToken>>(
      `/api/v1/clients/${clientId}/enrollment-tokens`,
    );

    return response.data;
  },

  async createEnrollmentToken(
    clientId: number,
    expiresInDays?: number,
  ): Promise<CreatedEnrollmentToken> {
    return apiClient.post<CreatedEnrollmentToken>(
      `/api/v1/clients/${clientId}/enrollment-tokens`,
      expiresInDays === undefined ? {} : { expiresInDays },
    );
  },

  // Token completo de novo, para instalar mais PCs do cliente.
  async revealEnrollmentToken(clientId: number, tokenId: number): Promise<string> {
    const response = await apiClient.post<{ token: string }>(
      `/api/v1/clients/${clientId}/enrollment-tokens/${tokenId}/reveal`,
    );

    return response.token;
  },

  async revokeEnrollmentToken(
    clientId: number,
    tokenId: number,
  ): Promise<EnrollmentToken> {
    return apiClient.post<EnrollmentToken>(
      `/api/v1/clients/${clientId}/enrollment-tokens/${tokenId}/revoke`,
    );
  },
};
