import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAutosave } from "./useAutosave";

describe("useAutosave", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("faz debounce e salva o último valor uma vez", () => {
    const commit = vi.fn();
    const { result } = renderHook(() =>
      useAutosave({ resetKey: 1, initialContent: "a", commit, delay: 800 }),
    );

    act(() => result.current.setContent("ab"));
    act(() => result.current.setContent("abc"));
    expect(commit).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(800));
    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith("abc");
  });

  it("reseta o conteúdo e salva pendências ao trocar de nota", () => {
    const commit = vi.fn();
    const { result, rerender } = renderHook((props) => useAutosave(props), {
      initialProps: { resetKey: 1, initialContent: "a", commit, delay: 800 },
    });

    act(() => result.current.setContent("editado"));
    rerender({ resetKey: 2, initialContent: "b", commit, delay: 800 });

    expect(commit).toHaveBeenCalledWith("editado");
    expect(result.current.content).toBe("b");
  });

  it("replace atualiza sem marcar como sujo", () => {
    const commit = vi.fn();
    const { result, unmount } = renderHook(() =>
      useAutosave({ resetKey: 1, initialContent: "a", commit, delay: 800 }),
    );

    act(() => result.current.replace("servidor"));
    expect(result.current.content).toBe("servidor");
    unmount();
    expect(commit).not.toHaveBeenCalled();
  });
});
