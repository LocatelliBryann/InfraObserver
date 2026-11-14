import type {
  ClientDirectoriesRecord,
  DirectoriesRecord,
  MonitoredDirectoriesRepository,
} from "../repositories/monitored-directories.repository";

export class EndpointNotFoundError extends Error {
  constructor() {
    super("Endpoint not found");
    this.name = "EndpointNotFoundError";
  }
}

export class ClientNotFoundError extends Error {
  constructor() {
    super("Client not found");
    this.name = "ClientNotFoundError";
  }
}

// De onde vêm as pastas que o PC deve monitorar.
// - endpoint: lista própria do PC;
// - client: lista do cliente (todos os PCs dele sem lista própria);
// - installation: as da instalação do agente (agent.env ou as do usuário).
export type DirectoriesSource = "endpoint" | "client" | "installation";

export interface EffectiveDirectories {
  source: DirectoriesSource;
  // Vazia com source "installation": o agente decide. Vazia nos outros
  // casos: nenhuma pasta (o PC só envia métricas).
  directories: string[];
  // Última mudança que afeta este PC, no PC ou no cliente.
  updatedAt: Date | null;
}

function latest(...dates: Array<Date | null>): Date | null {
  return dates.reduce<Date | null>(
    (current, date) => (date && (!current || date > current) ? date : current),
    null,
  );
}

// Lista própria do PC > lista do cliente > pastas da instalação.
export function effectiveDirectories(record: DirectoriesRecord): EffectiveDirectories {
  const updatedAt = latest(
    record.configuredDirectoriesAt,
    record.client?.configuredAt ?? null,
  );

  if (record.mode === "CUSTOM") {
    return {
      source: "endpoint",
      directories: record.configuredDirectories,
      updatedAt,
    };
  }

  if (record.client?.mode === "CUSTOM") {
    return {
      source: "client",
      directories: record.client.directories,
      updatedAt,
    };
  }

  return { source: "installation", directories: [], updatedAt };
}

// Como o dashboard mostra as pastas de um PC.
export interface DirectoriesView {
  endpointId: number;
  // inherit: segue o cliente; custom: lista própria.
  mode: "inherit" | "custom";
  // Lista própria do PC (vale só com mode custom).
  configuredDirectories: string[];
  client: { id: number; name: string; mode: "installation" | "custom" } | null;
  // O que vale para este PC agora, e de onde veio.
  effective: { source: DirectoriesSource; directories: string[] };
  // O que o agente informou que está monitorando.
  monitoredDirectories: string[];
  missingDirectories: string[];
  reportedAt: Date | null;
  // O agente ainda não confirmou a última mudança (no PC ou no cliente).
  pending: boolean;
}

export function toView(record: DirectoriesRecord): DirectoriesView {
  const effective = effectiveDirectories(record);
  const pending =
    effective.updatedAt !== null &&
    (record.directoriesReportedAt === null ||
      record.directoriesReportedAt < effective.updatedAt);

  return {
    endpointId: record.endpointId,
    mode: record.mode === "CUSTOM" ? "custom" : "inherit",
    configuredDirectories: record.configuredDirectories,
    client: record.client
      ? {
          id: record.client.clientId,
          name: record.client.name,
          mode: record.client.mode === "CUSTOM" ? "custom" : "installation",
        }
      : null,
    effective: { source: effective.source, directories: effective.directories },
    monitoredDirectories: record.monitoredDirectories,
    missingDirectories: record.missingDirectories,
    reportedAt: record.directoriesReportedAt,
    pending,
  };
}

// Como o dashboard mostra as pastas de um cliente.
export interface ClientDirectoriesView {
  clientId: number;
  mode: "installation" | "custom";
  directories: string[];
  configuredAt: Date | null;
  // PCs do cliente com lista própria, que não seguem esta configuração.
  customEndpointCount: number;
}

// O que o agente recebe ao consultar a configuração.
export interface AgentDirectoriesConfig {
  source: DirectoriesSource;
  monitoredDirectories: string[];
  updatedAt: Date | null;
}

export class MonitoredDirectoriesService {
  constructor(
    private readonly repository: MonitoredDirectoriesRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private async requireEndpoint(endpointId: number): Promise<DirectoriesRecord> {
    const record = await this.repository.findByEndpointId(endpointId);

    if (!record) {
      throw new EndpointNotFoundError();
    }

    return record;
  }

  private async requireAgent(agentId: string): Promise<DirectoriesRecord> {
    const record = await this.repository.findByAgentId(agentId);

    if (!record) {
      throw new EndpointNotFoundError();
    }

    return record;
  }

  private async toClientView(
    record: ClientDirectoriesRecord,
  ): Promise<ClientDirectoriesView> {
    return {
      clientId: record.clientId,
      mode: record.mode === "CUSTOM" ? "custom" : "installation",
      directories: record.directories,
      configuredAt: record.configuredAt,
      customEndpointCount: await this.repository.countCustomEndpoints(record.clientId),
    };
  }

  async get(endpointId: number): Promise<DirectoriesView> {
    return toView(await this.requireEndpoint(endpointId));
  }

  // RF10: o PC segue o cliente ou tem lista própria.
  async configure(
    endpointId: number,
    mode: "inherit" | "custom",
    directories: string[],
  ): Promise<DirectoriesView> {
    await this.requireEndpoint(endpointId);

    return toView(
      await this.repository.saveEndpoint(
        endpointId,
        mode === "custom" ? "CUSTOM" : "INHERIT",
        mode === "custom" ? directories : [],
        this.now(),
      ),
    );
  }

  async getClient(clientId: number): Promise<ClientDirectoriesView> {
    const record = await this.repository.findClient(clientId);

    if (!record) {
      throw new ClientNotFoundError();
    }

    return this.toClientView(record);
  }

  // RF10: uma configuração para todos os PCs do cliente sem lista própria.
  async configureClient(
    clientId: number,
    mode: "installation" | "custom",
    directories: string[],
  ): Promise<ClientDirectoriesView> {
    if (!(await this.repository.findClient(clientId))) {
      throw new ClientNotFoundError();
    }

    return this.toClientView(
      await this.repository.saveClient(
        clientId,
        mode === "custom" ? "CUSTOM" : "INSTALLATION",
        mode === "custom" ? directories : [],
        this.now(),
      ),
    );
  }

  async configForAgent(agentId: string): Promise<AgentDirectoriesConfig> {
    const effective = effectiveDirectories(await this.requireAgent(agentId));

    return {
      source: effective.source,
      monitoredDirectories: effective.directories,
      updatedAt: effective.updatedAt,
    };
  }

  async report(
    agentId: string,
    monitored: string[],
    missing: string[],
  ): Promise<void> {
    const record = await this.requireAgent(agentId);

    await this.repository.saveReport(
      record.endpointId,
      monitored,
      missing,
      this.now(),
    );
  }
}
