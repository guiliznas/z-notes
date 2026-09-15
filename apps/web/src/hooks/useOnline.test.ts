import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useOnline, usePendingSaves } from "./useOnline";

const mockSubscribe = vi.hoisted(() => vi.fn(() => vi.fn()));
const mockIsOnline = vi.hoisted(() => vi.fn());
const mockUseMutationState = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-query", () => ({
  onlineManager: { subscribe: mockSubscribe, isOnline: mockIsOnline },
  useMutationState: mockUseMutationState,
  useSyncExternalStore: () => true,
}));

vi.mock("@/offline/queryClient", () => ({
  UPDATE_NOTE_KEY: ["updateNote"],
}));

describe("useOnline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna true quando online", () => {
    mockIsOnline.mockReturnValue(true);
    const { result } = renderHook(() => useOnline());
    expect(result.current).toBe(true);
  });

  it("retorna false quando offline", () => {
    mockIsOnline.mockReturnValue(false);
    const { result } = renderHook(() => useOnline());
    expect(result.current).toBe(false);
  });
});

describe("usePendingSaves", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 0 quando não há mutações pausadas", () => {
    mockUseMutationState.mockReturnValue([]);
    const { result } = renderHook(() => usePendingSaves());
    expect(result.current).toBe(0);
  });

  it("conta mutações pausadas", () => {
    mockUseMutationState.mockReturnValue([true, false, true]);
    const { result } = renderHook(() => usePendingSaves());
    expect(result.current).toBe(2);
  });
});
