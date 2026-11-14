import { afterEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "../../src/services/apiClient";
import {
  monitoredDirectoriesService,
  validateDirectory,
} from "../../src/services/monitoredDirectoriesService";

vi.mock("../../src/services/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

describe("monitoredDirectoriesService", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("deve buscar as pastas do endpoint", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ endpointId: 7 });

    await monitoredDirectoriesService.get(7);

    expect(apiClient.get).toHaveBeenCalledWith(
      "/api/v1/endpoints/7/monitored-directories",
    );
  });

  it("deve salvar as pastas escolhidas para o PC", async () => {
    vi.mocked(apiClient.put).mockResolvedValue({ endpointId: 7 });

    await monitoredDirectoriesService.save(7, { mode: "custom", directories: ["C:\\Dados"] });

    expect(apiClient.put).toHaveBeenCalledWith(
      "/api/v1/endpoints/7/monitored-directories",
      { mode: "custom", directories: ["C:\\Dados"] },
    );
  });

  it("deve buscar e salvar as pastas do cliente", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ clientId: 3 });
    vi.mocked(apiClient.put).mockResolvedValue({ clientId: 3 });

    await monitoredDirectoriesService.getClient(3);
    await monitoredDirectoriesService.saveClient(3, { mode: "custom", directories: [] });

    expect(apiClient.get).toHaveBeenCalledWith("/api/v1/clients/3/monitored-directories");
    expect(apiClient.put).toHaveBeenCalledWith("/api/v1/clients/3/monitored-directories", {
      mode: "custom",
      directories: [],
    });
  });
});

describe("validateDirectory", () => {
  it.each(["C:\\Dados", "d:\\", "\\\\servidor\\escrituras"])(
    "deve aceitar %s",
    (path) => {
      expect(validateDirectory(path)).toBeNull();
    },
  );

  it.each([
    ["", "Informe o caminho da pasta."],
    ["Dados", "Use um caminho completo, como C:\\Dados ou \\\\servidor\\pasta."],
    ["C:\\Dados\\a?b", "O caminho tem caracteres que o Windows não aceita."],
    [`C:\\${"a".repeat(260)}`, "O caminho pode ter no máximo 260 caracteres."],
  ])("deve recusar %j", (path, message) => {
    expect(validateDirectory(path)).toBe(message);
  });
});
