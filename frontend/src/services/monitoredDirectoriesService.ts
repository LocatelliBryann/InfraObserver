import { apiClient } from "./apiClient";

// RF10: de onde vêm as pastas que o PC monitora.
// - endpoint: lista própria do PC;
// - client: lista do cliente (todos os PCs dele sem lista própria);
// - installation: as da instalação do agente.
export type DirectoriesSource = "endpoint" | "client" | "installation";

// Pastas de um PC, como o backend devolve.
export interface MonitoredDirectories {
  endpointId: number;
  // inherit: segue o cliente; custom: lista própria.
  mode: "inherit" | "custom";
  configuredDirectories: string[];
  client: { id: number; name: string; mode: "installation" | "custom" } | null;
  // O que vale para o PC agora (vazio com source "installation": as do agente).
  effective: { source: DirectoriesSource; directories: string[] };
  // O que o agente informou que está monitorando.
  monitoredDirectories: string[];
  // Pastas pedidas que não existem no PC.
  missingDirectories: string[];
  reportedAt: string | null;
  // O agente ainda não confirmou a última mudança.
  pending: boolean;
}

// Pastas de um cliente, herdadas pelos PCs sem lista própria.
export interface ClientDirectories {
  clientId: number;
  mode: "installation" | "custom";
  directories: string[];
  configuredAt: string | null;
  customEndpointCount: number;
}

export interface EndpointDirectoriesInput {
  mode: "inherit" | "custom";
  directories: string[];
}

export interface ClientDirectoriesInput {
  mode: "installation" | "custom";
  directories: string[];
}

export const MAX_DIRECTORIES = 20;

const DRIVE_PATH = /^[A-Za-z]:\\/;
const UNC_PATH = /^\\\\[^\\]+\\[^\\]+/;
// eslint-disable-next-line no-control-regex
const FORBIDDEN = /[\u0000-\u001f"<>|?*]/;

// Mesma regra do backend, para avisar antes de enviar.
export function validateDirectory(path: string): string | null {
  const trimmed = path.trim();

  if (!trimmed) {
    return "Informe o caminho da pasta.";
  }

  if (trimmed.length > 260) {
    return "O caminho pode ter no máximo 260 caracteres.";
  }

  if (!DRIVE_PATH.test(trimmed) && !UNC_PATH.test(trimmed)) {
    return "Use um caminho completo, como C:\\Dados ou \\\\servidor\\pasta.";
  }

  if (FORBIDDEN.test(trimmed) || trimmed.slice(2).includes(":")) {
    return "O caminho tem caracteres que o Windows não aceita.";
  }

  return null;
}

export const monitoredDirectoriesService = {
  async get(endpointId: number): Promise<MonitoredDirectories> {
    return apiClient.get<MonitoredDirectories>(
      `/api/v1/endpoints/${endpointId}/monitored-directories`,
    );
  },

  async save(
    endpointId: number,
    input: EndpointDirectoriesInput,
  ): Promise<MonitoredDirectories> {
    return apiClient.put<MonitoredDirectories>(
      `/api/v1/endpoints/${endpointId}/monitored-directories`,
      input,
    );
  },

  async getClient(clientId: number): Promise<ClientDirectories> {
    return apiClient.get<ClientDirectories>(
      `/api/v1/clients/${clientId}/monitored-directories`,
    );
  },

  async saveClient(
    clientId: number,
    input: ClientDirectoriesInput,
  ): Promise<ClientDirectories> {
    return apiClient.put<ClientDirectories>(
      `/api/v1/clients/${clientId}/monitored-directories`,
      input,
    );
  },
};
