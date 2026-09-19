import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { endpointsService } from "../../src/services/endpointsService";
import { useEndpoints } from "../../src/hooks/useEndpoints";

vi.mock("../../src/services/endpointsService", () => ({
  endpointsService: {
    getEndpoints: vi.fn(),
  },
}));

describe("useEndpoints", () => {
  it("deve carregar os endpoints da API", async () => {
    const mockEndpoints = [
      {
        id: "endpoint-1",
        hostname: "DESKTOP-TEST",
        status: "ONLINE",
      },
    ];

    vi.mocked(endpointsService.getEndpoints).mockResolvedValue(
      mockEndpoints,
    );

    const { result } = renderHook(() => useEndpoints());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.endpoints).toEqual(mockEndpoints);
    expect(result.current.error).toBeNull();
  });
});