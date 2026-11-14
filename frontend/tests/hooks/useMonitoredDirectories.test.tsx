import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  PENDING_REFRESH_INTERVAL_MS,
  useMonitoredDirectories,
} from "../../src/hooks/useMonitoredDirectories";
import {
  monitoredDirectoriesService,
  type MonitoredDirectories,
} from "../../src/services/monitoredDirectoriesService";

vi.mock("../../src/services/monitoredDirectoriesService", () => ({
  monitoredDirectoriesService: {
    get: vi.fn(),
    save: vi.fn(),
  },
}));

const mockedGet = vi.mocked(monitoredDirectoriesService.get);
const mockedSave = vi.mocked(monitoredDirectoriesService.save);

function directories(pending = false): MonitoredDirectories {
  return {
    endpointId: 7,
    mode: pending ? "custom" : "inherit",
    configuredDirectories: pending ? ["C:\\Dados"] : [],
    client: null,
    effective: pending
      ? { source: "endpoint", directories: ["C:\\Dados"] }
      : { source: "installation", directories: [] },
    monitoredDirectories: ["C:\\Users\\ana\\Documents"],
    missingDirectories: [],
    reportedAt: "2026-11-14T11:00:00.000Z",
    pending,
  };
}

describe("useMonitoredDirectories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGet.mockResolvedValue(directories());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("deve carregar as pastas do endpoint selecionado", async () => {
    const { result } = renderHook(() => useMonitoredDirectories(7));

    await waitFor(() => {
      expect(result.current.directories).toEqual(directories());
    });

    expect(mockedGet).toHaveBeenCalledWith(7);
    expect(result.current.error).toBeNull();
  });

  it("não deve buscar nada sem endpoint", () => {
    const { result } = renderHook(() => useMonitoredDirectories(null));

    expect(result.current.directories).toBeNull();
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("deve mostrar o erro quando a API falha", async () => {
    mockedGet.mockRejectedValue(new Error("offline"));

    const { result } = renderHook(() => useMonitoredDirectories(7));

    await waitFor(() => {
      expect(result.current.error).toBe(
        "Não foi possível carregar as pastas monitoradas.",
      );
    });
  });

  it("deve salvar e trocar pelo que a API devolveu", async () => {
    mockedSave.mockResolvedValue(directories(true));
    const { result } = renderHook(() => useMonitoredDirectories(7));

    await waitFor(() => expect(result.current.directories).not.toBeNull());

    await act(async () => {
      await result.current.save({ mode: "custom", directories: ["C:\\Dados"] });
    });

    expect(mockedSave).toHaveBeenCalledWith(7, { mode: "custom", directories: ["C:\\Dados"] });
    expect(result.current.directories?.pending).toBe(true);
  });

  it("deve conferir de novo enquanto o agente não aplicou a mudança", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockedGet.mockResolvedValueOnce(directories(true)).mockResolvedValue(directories());

    const { result } = renderHook(() => useMonitoredDirectories(7));

    await waitFor(() => expect(result.current.directories?.pending).toBe(true));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PENDING_REFRESH_INTERVAL_MS);
    });

    await waitFor(() => expect(result.current.directories?.pending).toBe(false));
    expect(mockedGet).toHaveBeenCalledTimes(2);
  });
});
