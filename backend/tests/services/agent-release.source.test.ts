import { describe, expect, it, vi } from "vitest";

import {
  GitHubAgentReleaseSource,
  installerName,
} from "../../src/services/agent-release.source";

const SHA = "a".repeat(64);
const DOWNLOAD = "https://github.com/LocatelliBryann/InfraObserver/releases/download/v1.5.0";

function response(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function release(assets: Array<Record<string, unknown>>, tag = "v1.5.0") {
  return { tag_name: tag, assets };
}

function installer(extra: Record<string, unknown> = {}) {
  return {
    name: installerName("1.5.0"),
    browser_download_url: `${DOWNLOAD}/${installerName("1.5.0")}`,
    ...extra,
  };
}

describe("GitHubAgentReleaseSource", () => {
  it("returns the installer of the latest release using the GitHub digest", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response(200, release([installer({ digest: `sha256:${SHA.toUpperCase()}` })])),
    );
    const source = new GitHubAgentReleaseSource("LocatelliBryann/InfraObserver", fetchMock);

    await expect(source.fetchRelease()).resolves.toEqual({
      version: "1.5.0",
      url: `${DOWNLOAD}/InfraObserverAgentSetup-1.5.0.exe`,
      sha256: SHA,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/LocatelliBryann/InfraObserver/releases/latest",
      expect.objectContaining({ headers: expect.objectContaining({ "User-Agent": "InfraObserver" }) }),
    );
  });

  it("asks for a specific tag when a version is pinned", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(404, {}));
    const source = new GitHubAgentReleaseSource("LocatelliBryann/InfraObserver", fetchMock);

    await expect(source.fetchRelease("1.4.2")).resolves.toBeNull();
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.github.com/repos/LocatelliBryann/InfraObserver/releases/tags/v1.4.2",
    );
  });

  it("ignores releases without a usable installer", async () => {
    const cases = [
      release([]),
      release([installer({ browser_download_url: "https://evil.example/setup.exe", digest: `sha256:${SHA}` })]),
      release([installer({ digest: "sha256:not-a-hash" })]),
      release([installer({ digest: `md5:${SHA}` })]),
      release([installer()]),
    ];

    for (const body of cases) {
      const source = new GitHubAgentReleaseSource(
        "LocatelliBryann/InfraObserver",
        vi.fn().mockResolvedValue(response(200, body)),
      );
      await expect(source.fetchRelease()).resolves.toBeNull();
    }
  });

  it("fails when GitHub is unavailable", async () => {
    const source = new GitHubAgentReleaseSource(
      "LocatelliBryann/InfraObserver",
      vi.fn().mockResolvedValue(response(503, {})),
    );

    await expect(source.fetchRelease()).rejects.toThrow("503");
  });
});
