import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useActiveSection } from "../../src/hooks/useActiveSection";

const SECTIONS = ["visao-geral", "alertas", "metricas"] as const;

type ObserverCallback = (entries: Partial<IntersectionObserverEntry>[]) => void;

let observerCallback: ObserverCallback | undefined;
const observe = vi.fn();
const disconnect = vi.fn();

class FakeIntersectionObserver {
  constructor(callback: ObserverCallback) {
    observerCallback = callback;
  }

  observe = observe;
  disconnect = disconnect;
}

function addSections() {
  for (const id of SECTIONS) {
    const element = document.createElement("section");
    element.id = id;
    document.body.appendChild(element);
  }
}

describe("useActiveSection", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
    addSections();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
    document.body.innerHTML = "";
    globalThis.location.hash = "";
    observerCallback = undefined;
  });

  it("should start on the first section", () => {
    const { result } = renderHook(() => useActiveSection(SECTIONS));

    expect(result.current.activeSection).toBe("visao-geral");
  });

  it("should start on the section in the URL hash", () => {
    globalThis.location.hash = "#metricas";

    const { result } = renderHook(() => useActiveSection(SECTIONS));

    expect(result.current.activeSection).toBe("metricas");
  });

  it("should observe every section and follow the visible one", () => {
    const { result } = renderHook(() => useActiveSection(SECTIONS));

    expect(observe).toHaveBeenCalledTimes(SECTIONS.length);

    act(() => {
      observerCallback?.([
        {
          isIntersecting: true,
          target: document.getElementById("alertas") as Element,
        },
      ]);
    });

    expect(result.current.activeSection).toBe("alertas");
  });

  it("should ignore sections leaving the screen", () => {
    const { result } = renderHook(() => useActiveSection(SECTIONS));

    act(() => {
      observerCallback?.([
        {
          isIntersecting: false,
          target: document.getElementById("metricas") as Element,
        },
      ]);
    });

    expect(result.current.activeSection).toBe("visao-geral");
  });

  it("should follow hash changes", () => {
    const { result } = renderHook(() => useActiveSection(SECTIONS));

    act(() => {
      globalThis.location.hash = "#alertas";
      globalThis.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    expect(result.current.activeSection).toBe("alertas");
  });

  it("should activate the last section at the bottom of the page", () => {
    const { result } = renderHook(() => useActiveSection(SECTIONS));

    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      value: 2000,
    });
    vi.stubGlobal("innerHeight", 800);
    vi.stubGlobal("scrollY", 1200);

    act(() => {
      globalThis.dispatchEvent(new Event("scroll"));
    });

    expect(result.current.activeSection).toBe("metricas");
  });

  it("should not change the section when scrolling in the middle", () => {
    const { result } = renderHook(() => useActiveSection(SECTIONS));

    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      value: 2000,
    });
    vi.stubGlobal("innerHeight", 800);
    vi.stubGlobal("scrollY", 300);

    act(() => {
      globalThis.dispatchEvent(new Event("scroll"));
    });

    expect(result.current.activeSection).toBe("visao-geral");
  });

  it("should stop observing on unmount", () => {
    const { unmount } = renderHook(() => useActiveSection(SECTIONS));

    unmount();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });

  it("should work without IntersectionObserver support", () => {
    vi.stubGlobal("IntersectionObserver", undefined);

    const { result } = renderHook(() => useActiveSection(SECTIONS));

    expect(result.current.activeSection).toBe("visao-geral");
  });
});
