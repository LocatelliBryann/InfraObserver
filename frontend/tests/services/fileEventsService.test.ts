import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  getRecentFileEvents,
  type FileEvent,
} from "../../src/services/fileEventsService";

import { apiClient } from "../../src/services/apiClient";

vi.mock("../../src/services/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const mockedApiClientGet = vi.mocked(apiClient.get);

const mockEvents: FileEvent[] = [
  {
    id: 1,
    endpointId: 10,
    username: "admin",
    eventType: "created",
    filePath: "C:\\Users\\admin\\documento.txt",
    occurredAt: "2026-09-22T10:00:00.000Z",
    receivedAt: "2026-09-22T10:00:01.000Z",
    endpoint: {
      hostname: "DESKTOP-TEST",
    },
  },
];

describe("fileEventsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve buscar os eventos recentes com o limite padrão", async () => {
    mockedApiClientGet.mockResolvedValue(mockEvents);

    const result = await getRecentFileEvents();

    expect(mockedApiClientGet).toHaveBeenCalledWith(
      "/api/v1/file-events?limit=20",
    );

    expect(result).toEqual(mockEvents);
  });

  it("deve buscar os eventos com o limite informado", async () => {
    const emptyEvents: FileEvent[] = [];

    mockedApiClientGet.mockResolvedValue(emptyEvents);

    const result = await getRecentFileEvents(10);

    expect(mockedApiClientGet).toHaveBeenCalledWith(
      "/api/v1/file-events?limit=10",
    );

    expect(result).toEqual(emptyEvents);
  });

  it("deve propagar erros da API", async () => {
    const apiError = new Error("API error");

    mockedApiClientGet.mockRejectedValue(apiError);

    await expect(getRecentFileEvents()).rejects.toThrow("API error");
  });
});