// Busca o instalador do agente nas releases do GitHub.
// O workflow agent-windows.yml anexa em cada release o
// InfraObserverAgentSetup-<versão>.exe; o SHA-256 vem da própria API do GitHub.

export interface AgentRelease {
  version: string;
  url: string;
  sha256: string;
}

export interface AgentReleaseSource {
  // Sem versão: a última release publicada. Devolve null se ela não tiver instalador.
  fetchRelease(version?: string): Promise<AgentRelease | null>;
}

interface GitHubAsset {
  name: string;
  browser_download_url: string;
  digest?: string | null;
}

interface GitHubRelease {
  tag_name: string;
  assets?: GitHubAsset[];
}

type FetchLike = (
  input: string,
  init?: { headers?: Record<string, string>; signal?: AbortSignal },
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const ALLOWED_DOWNLOAD_PREFIX = "https://github.com/";

// O GitHub informa o SHA-256 de cada arquivo da release no campo "digest".
function readSha256(asset: GitHubAsset): string | null {
  const digest = asset.digest?.toLowerCase();

  if (!digest?.startsWith("sha256:")) {
    return null;
  }

  const value = digest.slice("sha256:".length);
  return SHA256_PATTERN.test(value) ? value : null;
}

export function installerName(version: string): string {
  return `InfraObserverAgentSetup-${version}.exe`;
}

export class GitHubAgentReleaseSource implements AgentReleaseSource {
  constructor(
    private readonly repository: string,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly timeoutMs = 10_000,
  ) {}

  async fetchRelease(version?: string): Promise<AgentRelease | null> {
    const path = version
      ? `releases/tags/v${encodeURIComponent(version)}`
      : "releases/latest";

    const response = await this.request(
      `https://api.github.com/repos/${this.repository}/${path}`,
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`GitHub API responded with ${response.status}`);
    }

    return this.parseRelease((await response.json()) as GitHubRelease);
  }

  private parseRelease(release: GitHubRelease): AgentRelease | null {
    const version = release.tag_name.replace(/^v/, "");
    const installer = (release.assets ?? []).find(
      (asset) => asset.name === installerName(version),
    );

    if (
      !installer ||
      !installer.browser_download_url.startsWith(ALLOWED_DOWNLOAD_PREFIX)
    ) {
      return null;
    }

    const sha256 = readSha256(installer);

    if (!sha256) {
      return null;
    }

    return { version, url: installer.browser_download_url, sha256 };
  }

  // Só chama a API do GitHub, num endereço montado com o repositório da
  // configuração: nenhum endereço que vem na resposta é acessado pelo servidor.
  private request(url: string) {
    return this.fetchImpl(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "InfraObserver",
      },
      signal: AbortSignal.timeout(this.timeoutMs),
    });
  }
}
