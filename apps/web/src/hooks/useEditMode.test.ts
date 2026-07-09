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

  it("persiste preferência no localStorage", () => {
    const { result } = renderHook(() => useEditMode());
    act(() => result.current.enterEdit());
    expect(localStorage.getItem("z-notes-edit-mode")).toBe("edit");
  });

  it("restaura preferência 'edit' do localStorage", () => {
    localStorage.setItem("z-notes-edit-mode", "edit");
    const { result } = renderHook(() => useEditMode());
    expect(result.current.editing).toBe(true);
  });

  it("ignora valor inválido no localStorage e cai em preview", () => {
    localStorage.setItem("z-notes-edit-mode", "blah");
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
