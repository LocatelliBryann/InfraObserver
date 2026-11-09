// Busca o instalador do agente nas releases do GitHub.
// O workflow agent-windows.yml anexa em cada release o
// InfraObserverAgentSetup-<versão>.exe e o .sha256 dele.

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
  text(): Promise<string>;
}>;

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const ALLOWED_DOWNLOAD_PREFIX = "https://github.com/";

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

  private async parseRelease(
    release: GitHubRelease,
  ): Promise<AgentRelease | null> {
    const version = release.tag_name.replace(/^v/, "");
    const assets = release.assets ?? [];
    const installer = assets.find((asset) => asset.name === installerName(version));

    if (
      !installer ||
      !installer.browser_download_url.startsWith(ALLOWED_DOWNLOAD_PREFIX)
    ) {
      return null;
    }

    const sha256 = await this.resolveSha256(installer, assets);

    if (!sha256) {
      return null;
    }

    return { version, url: installer.browser_download_url, sha256 };
  }

  // O GitHub informa o SHA-256 de cada arquivo (campo digest); releases antigas
  // não têm, então vale o .sha256 publicado junto.
  private async resolveSha256(
    installer: GitHubAsset,
    assets: GitHubAsset[],
  ): Promise<string | null> {
    const digest = installer.digest?.toLowerCase();

    if (digest?.startsWith("sha256:")) {
      const value = digest.slice("sha256:".length);
      return SHA256_PATTERN.test(value) ? value : null;
    }

    const checksum = assets.find((asset) => asset.name === `${installer.name}.sha256`);

    if (!checksum?.browser_download_url.startsWith(ALLOWED_DOWNLOAD_PREFIX)) {
      return null;
    }

    const response = await this.request(checksum.browser_download_url);

    if (!response.ok) {
      return null;
    }

    const value = (await response.text()).trim().split(/\s+/)[0]?.toLowerCase() ?? "";
    return SHA256_PATTERN.test(value) ? value : null;
  }

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
