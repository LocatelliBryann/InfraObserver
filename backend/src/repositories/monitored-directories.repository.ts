import { prisma } from "../database/prisma";

// Valores guardados no banco (RF10).
export type EndpointDirectoriesMode = "INHERIT" | "CUSTOM";
export type ClientDirectoriesMode = "INSTALLATION" | "CUSTOM";

export interface ClientDirectoriesRecord {
  clientId: number;
  name: string;
  mode: ClientDirectoriesMode;
  directories: string[];
  configuredAt: Date | null;
}

// Pastas de um endpoint: o que o dashboard pediu (no PC e no cliente dele) e
// o que o agente informou.
export interface DirectoriesRecord {
  endpointId: number;
  agentId: string;
  mode: EndpointDirectoriesMode;
  configuredDirectories: string[];
  configuredDirectoriesAt: Date | null;
  monitoredDirectories: string[];
  missingDirectories: string[];
  directoriesReportedAt: Date | null;
  // Nulo nos PCs sem cliente (agentes antigos).
  client: ClientDirectoriesRecord | null;
}

export interface MonitoredDirectoriesRepository {
  findByEndpointId(endpointId: number): Promise<DirectoriesRecord | null>;

  findByAgentId(agentId: string): Promise<DirectoriesRecord | null>;

  saveEndpoint(
    endpointId: number,
    mode: EndpointDirectoriesMode,
    directories: string[],
    at: Date,
  ): Promise<DirectoriesRecord>;

  saveReport(
    endpointId: number,
    monitored: string[],
    missing: string[],
    at: Date,
  ): Promise<DirectoriesRecord>;

  findClient(clientId: number): Promise<ClientDirectoriesRecord | null>;

  saveClient(
    clientId: number,
    mode: ClientDirectoriesMode,
    directories: string[],
    at: Date,
  ): Promise<ClientDirectoriesRecord>;

  // Quantos PCs do cliente têm lista própria (não seguem o cliente).
  countCustomEndpoints(clientId: number): Promise<number>;
}

const CLIENT_SELECT = {
  id: true,
  name: true,
  directoriesMode: true,
  configuredDirectories: true,
  configuredDirectoriesAt: true,
} as const;

const ENDPOINT_SELECT = {
  id: true,
  agentId: true,
  directoriesMode: true,
  configuredDirectories: true,
  configuredDirectoriesAt: true,
  monitoredDirectories: true,
  missingDirectories: true,
  directoriesReportedAt: true,
  client: { select: CLIENT_SELECT },
} as const;

type ClientRow = {
  id: number;
  name: string;
  directoriesMode: string;
  configuredDirectories: string[];
  configuredDirectoriesAt: Date | null;
};

type EndpointRow = {
  id: number;
  agentId: string;
  directoriesMode: string;
  configuredDirectories: string[];
  configuredDirectoriesAt: Date | null;
  monitoredDirectories: string[];
  missingDirectories: string[];
  directoriesReportedAt: Date | null;
  client: ClientRow | null;
};

function toClientRecord(row: ClientRow): ClientDirectoriesRecord {
  return {
    clientId: row.id,
    name: row.name,
    mode: row.directoriesMode === "CUSTOM" ? "CUSTOM" : "INSTALLATION",
    directories: row.configuredDirectories,
    configuredAt: row.configuredDirectoriesAt,
  };
}

function toRecord(row: EndpointRow): DirectoriesRecord {
  return {
    endpointId: row.id,
    agentId: row.agentId,
    mode: row.directoriesMode === "CUSTOM" ? "CUSTOM" : "INHERIT",
    configuredDirectories: row.configuredDirectories,
    configuredDirectoriesAt: row.configuredDirectoriesAt,
    monitoredDirectories: row.monitoredDirectories,
    missingDirectories: row.missingDirectories,
    directoriesReportedAt: row.directoriesReportedAt,
    client: row.client ? toClientRecord(row.client) : null,
  };
}

export class PrismaMonitoredDirectoriesRepository
  implements MonitoredDirectoriesRepository
{
  async findByEndpointId(endpointId: number) {
    const row = await prisma.endpoint.findUnique({
      where: { id: endpointId },
      select: ENDPOINT_SELECT,
    });

    return row ? toRecord(row) : null;
  }

  async findByAgentId(agentId: string) {
    const row = await prisma.endpoint.findUnique({
      where: { agentId },
      select: ENDPOINT_SELECT,
    });

    return row ? toRecord(row) : null;
  }

  async saveEndpoint(
    endpointId: number,
    mode: EndpointDirectoriesMode,
    directories: string[],
    at: Date,
  ) {
    const row = await prisma.endpoint.update({
      where: { id: endpointId },
      data: {
        directoriesMode: mode,
        configuredDirectories: directories,
        configuredDirectoriesAt: at,
      },
      select: ENDPOINT_SELECT,
    });

    return toRecord(row);
  }

  async saveReport(
    endpointId: number,
    monitored: string[],
    missing: string[],
    at: Date,
  ) {
    const row = await prisma.endpoint.update({
      where: { id: endpointId },
      data: {
        monitoredDirectories: monitored,
        missingDirectories: missing,
        directoriesReportedAt: at,
      },
      select: ENDPOINT_SELECT,
    });

    return toRecord(row);
  }

  async findClient(clientId: number) {
    const row = await prisma.client.findUnique({
      where: { id: clientId },
      select: CLIENT_SELECT,
    });

    return row ? toClientRecord(row) : null;
  }

  async saveClient(
    clientId: number,
    mode: ClientDirectoriesMode,
    directories: string[],
    at: Date,
  ) {
    const row = await prisma.client.update({
      where: { id: clientId },
      data: {
        directoriesMode: mode,
        configuredDirectories: directories,
        configuredDirectoriesAt: at,
      },
      select: CLIENT_SELECT,
    });

    return toClientRecord(row);
  }

  async countCustomEndpoints(clientId: number) {
    return prisma.endpoint.count({
      where: { clientId, directoriesMode: "CUSTOM" },
    });
  }
}
