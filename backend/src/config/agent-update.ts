// Atualização automática dos agentes (docs/agent-windows.md#atualização-automática).
//
// AGENT_UPDATES_ENABLED  "false" desliga: a API responde que não há atualização
// AGENT_UPDATE_VERSION   fixa a versão liberada (ex.: 1.5.0); vazio = última release
// AGENT_RELEASES_REPO    repositório do GitHub com as releases (dono/nome)

export const DEFAULT_RELEASES_REPO = "LocatelliBryann/InfraObserver";

const REPO_PATTERN = /^[\w.-]+\/[\w.-]+$/;
const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;

export interface AgentUpdateConfig {
  enabled: boolean;
  repository: string;
  pinnedVersion?: string;
}

export function getAgentUpdateConfig(
  env: NodeJS.ProcessEnv = process.env,
): AgentUpdateConfig {
  const repository = env.AGENT_RELEASES_REPO?.trim() || DEFAULT_RELEASES_REPO;

  if (!REPO_PATTERN.test(repository)) {
    throw new Error("AGENT_RELEASES_REPO must look like owner/name");
  }

  const pinned = env.AGENT_UPDATE_VERSION?.trim().replace(/^v/, "");

  if (pinned && !VERSION_PATTERN.test(pinned)) {
    throw new Error("AGENT_UPDATE_VERSION must look like 1.5.0");
  }

  return {
    enabled: env.AGENT_UPDATES_ENABLED?.trim().toLowerCase() !== "false",
    repository,
    pinnedVersion: pinned || undefined,
  };
}
