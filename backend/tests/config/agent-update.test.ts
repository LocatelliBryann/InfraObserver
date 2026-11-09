import { describe, expect, it } from "vitest";

import {
  DEFAULT_RELEASES_REPO,
  getAgentUpdateConfig,
} from "../../src/config/agent-update";

describe("getAgentUpdateConfig", () => {
  it("uses the latest release of the project by default", () => {
    expect(getAgentUpdateConfig({})).toEqual({
      enabled: true,
      repository: DEFAULT_RELEASES_REPO,
      pinnedVersion: undefined,
    });
  });

  it("pins a version with or without the v prefix", () => {
    expect(getAgentUpdateConfig({ AGENT_UPDATE_VERSION: "v1.5.0" }).pinnedVersion).toBe("1.5.0");
    expect(getAgentUpdateConfig({ AGENT_UPDATE_VERSION: " 1.4.2 " }).pinnedVersion).toBe("1.4.2");
  });

  it("can be turned off", () => {
    expect(getAgentUpdateConfig({ AGENT_UPDATES_ENABLED: "FALSE" }).enabled).toBe(false);
  });

  it("accepts another repository", () => {
    expect(getAgentUpdateConfig({ AGENT_RELEASES_REPO: "empresa/infraobserver" }).repository).toBe(
      "empresa/infraobserver",
    );
  });

  it("rejects invalid values", () => {
    expect(() => getAgentUpdateConfig({ AGENT_UPDATE_VERSION: "latest" })).toThrow(
      "AGENT_UPDATE_VERSION",
    );
    expect(() => getAgentUpdateConfig({ AGENT_RELEASES_REPO: "https://evil.example/x" })).toThrow(
      "AGENT_RELEASES_REPO",
    );
  });
});
