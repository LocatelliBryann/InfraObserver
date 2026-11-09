import type { Logger } from "../config/logger";
import type { AgentRelease, AgentReleaseSource } from "./agent-release.source";

// A resposta do GitHub fica em memória: todos os agentes consultam a cada
// poucas horas e a API pública do GitHub aceita 60 chamadas por hora.
const CACHE_TTL_MS = 60 * 60 * 1000;
// Release ainda sem instalador (o workflow leva alguns minutos para anexar)
// ou GitHub fora do ar: pergunta de novo mais cedo.
const NOT_FOUND_TTL_MS = 10 * 60 * 1000;
const FAILURE_TTL_MS = 5 * 60 * 1000;

interface AgentUpdateOptions {
  enabled: boolean;
  pinnedVersion?: string;
  logger: Logger;
  now?: () => number;
}

export class AgentUpdateService {
  private cached?: { value: AgentRelease | null; expiresAt: number };
  private pending?: Promise<AgentRelease | null>;

  constructor(
    private readonly source: AgentReleaseSource,
    private readonly options: AgentUpdateOptions,
  ) {}

  // Versão que os agentes devem instalar, ou null se não houver.
  async getAvailableRelease(): Promise<AgentRelease | null> {
    if (!this.options.enabled) {
      return null;
    }

    const now = this.now();

    if (this.cached && this.cached.expiresAt > now) {
      return this.cached.value;
    }

    // Vários agentes ao mesmo tempo: uma única consulta ao GitHub.
    this.pending ??= this.load().finally(() => {
      this.pending = undefined;
    });

    return this.pending;
  }

  private async load(): Promise<AgentRelease | null> {
    try {
      const release = await this.source.fetchRelease(this.options.pinnedVersion);

      if (!release) {
        this.options.logger.warn(
          { pinnedVersion: this.options.pinnedVersion },
          "No agent installer found in the releases",
        );
      }

      this.cached = {
        value: release,
        expiresAt: this.now() + (release ? CACHE_TTL_MS : NOT_FOUND_TTL_MS),
      };
      return release;
    } catch (error) {
      this.options.logger.warn({ err: error }, "Could not check agent releases");
      this.cached = { value: null, expiresAt: this.now() + FAILURE_TTL_MS };
      return null;
    }
  }

  private now(): number {
    return this.options.now?.() ?? Date.now();
  }
}
