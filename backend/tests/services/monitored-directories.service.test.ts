import { describe, expect, it, vi } from "vitest";

import type {
  ClientDirectoriesRecord,
  DirectoriesRecord,
} from "../../src/repositories/monitored-directories.repository";
import {
  ClientNotFoundError,
  EndpointNotFoundError,
  MonitoredDirectoriesService,
  effectiveDirectories,
  toView,
} from "../../src/services/monitored-directories.service";

const AGENT_ID = "550e8400-e29b-41d4-a716-446655440020";
const NOW = new Date("2026-11-14T12:00:00.000Z");
const EARLIER = new Date("2026-11-14T10:00:00.000Z");
const LATER = new Date("2026-11-14T11:00:00.000Z");

function client(overrides: Partial<ClientDirectoriesRecord> = {}): ClientDirectoriesRecord {
  return {
    clientId: 3,
    name: "1RIJOINVILLE",
    mode: "INSTALLATION",
    directories: [],
    configuredAt: null,
    ...overrides,
  };
}

function record(overrides: Partial<DirectoriesRecord> = {}): DirectoriesRecord {
  return {
    endpointId: 7,
    agentId: AGENT_ID,
    mode: "INHERIT",
    configuredDirectories: [],
    configuredDirectoriesAt: null,
    monitoredDirectories: ["C:\\Users\\ana\\Documents"],
    missingDirectories: [],
    directoriesReportedAt: EARLIER,
    client: client(),
    ...overrides,
  };
}

function createRepository(found: DirectoriesRecord | null = record()) {
  return {
    findByEndpointId: vi.fn().mockResolvedValue(found),
    findByAgentId: vi.fn().mockResolvedValue(found),
    saveEndpoint: vi
      .fn()
      .mockImplementation(async (_id: number, mode, directories: string[], at: Date) =>
        record({ mode, configuredDirectories: directories, configuredDirectoriesAt: at }),
      ),
    saveReport: vi.fn().mockResolvedValue(record()),
    findClient: vi.fn().mockResolvedValue(found?.client ?? null),
    saveClient: vi
      .fn()
      .mockImplementation(async (_id: number, mode, directories: string[], at: Date) =>
        client({ mode, directories, configuredAt: at }),
      ),
    countCustomEndpoints: vi.fn().mockResolvedValue(1),
  };
}

describe("effectiveDirectories", () => {
  it("should use the installation folders when nothing was chosen", () => {
    expect(effectiveDirectories(record())).toEqual({
      source: "installation",
      directories: [],
      updatedAt: null,
    });
  });

  it("should use the client list for PCs that follow the client", () => {
    expect(
      effectiveDirectories(
        record({ client: client({ mode: "CUSTOM", directories: [], configuredAt: LATER }) }),
      ),
    ).toEqual({ source: "client", directories: [], updatedAt: LATER });
  });

  it("should prefer the PC's own list over the client's", () => {
    const effective = effectiveDirectories(
      record({
        mode: "CUSTOM",
        configuredDirectories: ["D:\\Escrituras"],
        configuredDirectoriesAt: EARLIER,
        client: client({ mode: "CUSTOM", directories: [], configuredAt: LATER }),
      }),
    );

    expect(effective).toEqual({
      source: "endpoint",
      directories: ["D:\\Escrituras"],
      updatedAt: LATER,
    });
  });

  it("should use the installation folders for PCs without a client", () => {
    expect(effectiveDirectories(record({ client: null })).source).toBe("installation");
  });
});

describe("toView", () => {
  it("should not be pending when nothing was configured", () => {
    expect(toView(record()).pending).toBe(false);
  });

  it("should be pending until the agent confirms a change in the PC or in the client", () => {
    expect(
      toView(record({ client: client({ mode: "CUSTOM", configuredAt: LATER }) })).pending,
    ).toBe(true);
    expect(
      toView(
        record({
          client: client({ mode: "CUSTOM", configuredAt: LATER }),
          directoriesReportedAt: NOW,
        }),
      ).pending,
    ).toBe(false);
    expect(
      toView(record({ configuredDirectoriesAt: LATER, directoriesReportedAt: null })).pending,
    ).toBe(true);
  });

  it("should show where the folders come from", () => {
    const view = toView(
      record({ client: client({ mode: "CUSTOM", directories: ["\\\\srv\\a"] }) }),
    );

    expect(view.mode).toBe("inherit");
    expect(view.client).toEqual({ id: 3, name: "1RIJOINVILLE", mode: "custom" });
    expect(view.effective).toEqual({ source: "client", directories: ["\\\\srv\\a"] });
  });
});

describe("MonitoredDirectoriesService", () => {
  it("should save the PC's own list with the time", async () => {
    const repository = createRepository();
    const service = new MonitoredDirectoriesService(repository, () => NOW);

    const view = await service.configure(7, "custom", ["C:\\Dados"]);

    expect(repository.saveEndpoint).toHaveBeenCalledWith(7, "CUSTOM", ["C:\\Dados"], NOW);
    expect(view.effective.source).toBe("endpoint");
    expect(view.pending).toBe(true);
  });

  it("should drop the PC's list when it goes back to following the client", async () => {
    const repository = createRepository();
    const service = new MonitoredDirectoriesService(repository, () => NOW);

    await service.configure(7, "inherit", ["C:\\Dados"]);

    expect(repository.saveEndpoint).toHaveBeenCalledWith(7, "INHERIT", [], NOW);
  });

  it("should save the client list and count the PCs with their own list", async () => {
    const repository = createRepository();
    const service = new MonitoredDirectoriesService(repository, () => NOW);

    const view = await service.configureClient(3, "custom", []);

    expect(repository.saveClient).toHaveBeenCalledWith(3, "CUSTOM", [], NOW);
    expect(view).toEqual({
      clientId: 3,
      mode: "custom",
      directories: [],
      configuredAt: NOW,
      customEndpointCount: 1,
    });
    await expect(service.getClient(3)).resolves.toMatchObject({ mode: "installation" });
  });

  it("should give the agent the folders that apply to it", async () => {
    const service = new MonitoredDirectoriesService(
      createRepository(
        record({ client: client({ mode: "CUSTOM", directories: ["\\\\srv\\a"], configuredAt: LATER }) }),
      ),
    );

    await expect(service.configForAgent(AGENT_ID)).resolves.toEqual({
      source: "client",
      monitoredDirectories: ["\\\\srv\\a"],
      updatedAt: LATER,
    });
  });

  it("should save what the agent reports", async () => {
    const repository = createRepository();
    const service = new MonitoredDirectoriesService(repository, () => NOW);

    await service.report(AGENT_ID, ["C:\\Dados"], ["D:\\Removida"]);

    expect(repository.saveReport).toHaveBeenCalledWith(7, ["C:\\Dados"], ["D:\\Removida"], NOW);
  });

  it("should fail for an unknown endpoint or client", async () => {
    const service = new MonitoredDirectoriesService(createRepository(null));

    await expect(service.get(99)).rejects.toBeInstanceOf(EndpointNotFoundError);
    await expect(service.configure(99, "inherit", [])).rejects.toBeInstanceOf(
      EndpointNotFoundError,
    );
    await expect(service.configForAgent(AGENT_ID)).rejects.toBeInstanceOf(EndpointNotFoundError);
    await expect(service.report(AGENT_ID, [], [])).rejects.toBeInstanceOf(EndpointNotFoundError);
    await expect(service.getClient(99)).rejects.toBeInstanceOf(ClientNotFoundError);
    await expect(service.configureClient(99, "custom", [])).rejects.toBeInstanceOf(
      ClientNotFoundError,
    );
  });
});
