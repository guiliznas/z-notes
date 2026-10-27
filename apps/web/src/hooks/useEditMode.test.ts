import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEditMode } from "./useEditMode";

describe("useEditMode", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("padrão é preview (false)", () => {
    const { result } = renderHook(() => useEditMode());
    expect(result.current.editing).toBe(false);
  });

  it("entra em edição ao chamar enterEdit", () => {
    const { result } = renderHook(() => useEditMode());
    act(() => result.current.enterEdit());
    expect(result.current.editing).toBe(true);
  });

  it("sai da edição ao chamar exitEdit", () => {
    const { result } = renderHook(() => useEditMode());
    act(() => result.current.enterEdit());
    act(() => result.current.exitEdit());
    expect(result.current.editing).toBe(false);
  });

  it("não lembra o modo edição entre sessões: abre sempre em visualização", () => {
    const first = renderHook(() => useEditMode());
    act(() => first.result.current.enterEdit());
    first.unmount();
    const second = renderHook(() => useEditMode());
    expect(second.result.current.editing).toBe(false);
  });

  it("ignora preferência antiga 'edit' que versões anteriores gravavam no localStorage", () => {
    localStorage.setItem("z-notes-edit-mode", "edit");
    const { result } = renderHook(() => useEditMode());
    expect(result.current.editing).toBe(false);
  });

  it("reseta para preview ao trocar de resetKey", () => {
    const { result, rerender } = renderHook(({ id }) => useEditMode(id), { initialProps: { id: 1 } });
    act(() => result.current.enterEdit());
    rerender({ id: 2 });
    expect(result.current.editing).toBe(false);
  });
});
