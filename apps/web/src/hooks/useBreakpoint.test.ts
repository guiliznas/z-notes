import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBreakpoint } from "./useBreakpoint";

describe("useBreakpoint", () => {
  function setWidth(w: number) {
    Object.defineProperty(window, "innerWidth", { value: w, configurable: true });
  }

  beforeEach(() => {
    setWidth(1024);
  });

  it("retorna desktop para largura >= 1024", () => {
    setWidth(1440);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe("desktop");
  });

  it("retorna tablet para 640-1023", () => {
    setWidth(768);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe("tablet");
  });

  it("retorna mobile para < 640", () => {
    setWidth(375);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe("mobile");
  });

  it("atualiza ao redimensionar", () => {
    setWidth(1440);
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current).toBe("desktop");

    act(() => {
      setWidth(375);
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current).toBe("mobile");
  });

  it("limpa event listener ao desmontar", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useBreakpoint());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("resize", expect.any(Function));
  });
});
