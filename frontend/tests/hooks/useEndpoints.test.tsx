import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useEndpoints } from "../../src/hooks/useEndpoints";
import { endpointsService } from "../../src/services/endpointsService";

vi.mock("../../src/services/endpointsService", () => ({
  endpointsService: {
    getEndpoints: vi.fn(),
  },
}));

const mockedGetEndpoints = vi.mocked(endpointsService.getEndpoints);

const mockEndpoints = [
  {
    id: "endpoint-1",
    hostname: "DESKTOP-TEST",
    status: "ONLINE",
  },
];

describe("useEndpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetEndpoints.mockResolvedValue(mockEndpoints);
  });

  it("deve carregar os endpoints da API", async () => {
    const { result } = renderHook(() => useEndpoints());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockedGetEndpoints).toHaveBeenCalledTimes(1);
    expect(result.current.endpoints).toEqual(mockEndpoints);
    expect(result.current.error).toBeNull();
  });

  it("deve atualizar os endpoints manualmente", async () => {
    const updatedEndpoints = [
      ...mockEndpoints,
      {
        id: "endpoint-2",
        hostname: "SERVER-TEST",
        status: "OFFLINE",
      },
    ];

    const { result } = renderHook(() => useEndpoints());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockedGetEndpoints.mockResolvedValue(updatedEndpoints);

    await act(async () => {
      await result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.endpoints).toEqual(updatedEndpoints);
    });

    expect(mockedGetEndpoints).toHaveBeenCalledTimes(2);
    expect(result.current.error).toBeNull();
  });
});