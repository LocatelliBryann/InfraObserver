import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useMetrics } from "../../src/hooks/useMetrics";
import { getMetrics } from "../../src/services/metricsService";

vi.mock("../../src/services/metricsService", () => ({
  getMetrics: vi.fn(),
}));

const mockedGetMetrics = vi.mocked(getMetrics);

describe("useMetrics com período", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetMetrics.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("busca a última hora com limite maior", async () => {
    const now = new Date("2026-11-05T12:00:00.000Z");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);

    renderHook(() => useMetrics(4, "1h"));

    await waitFor(() => {
      expect(mockedGetMetrics).toHaveBeenCalledWith(4, 120, {
        from: new Date("2026-11-05T11:00:00.000Z"),
      });
    });
  });

  it("refaz a busca ao trocar o período", async () => {
    const { rerender } = renderHook(
      ({ period }) => useMetrics(4, period),
      { initialProps: { period: "live" as "live" | "24h" } },
    );

    await waitFor(() => {
      expect(mockedGetMetrics).toHaveBeenCalledWith(4);
    });

    rerender({ period: "24h" });

    await waitFor(() => {
      expect(mockedGetMetrics).toHaveBeenLastCalledWith(
        4,
        1500,
        expect.objectContaining({ from: expect.any(Date) }),
      );
    });
  });
});
