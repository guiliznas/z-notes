import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSelection } from "./useSelection";

const mockUseLocation = vi.fn();
const mockUseParams = vi.fn();

vi.mock("react-router-dom", () => ({
  useLocation: () => mockUseLocation(),
  useParams: () => mockUseParams(),
}));

describe("useSelection", () => {
  it("reconhece página raiz como pane folders", () => {
    mockUseLocation.mockReturnValue({ pathname: "/" });
    mockUseParams.mockReturnValue({});
    const { result } = renderHook(() => useSelection());
    expect(result.current.pane).toBe("folders");
    expect(result.current.source).toEqual({ kind: "all" });
    expect(result.current.noteId).toBeNull();
  });

  it("reconhece /all como pane list", () => {
    mockUseLocation.mockReturnValue({ pathname: "/all" });
    mockUseParams.mockReturnValue({});
    const { result } = renderHook(() => useSelection());
    expect(result.current.pane).toBe("list");
    expect(result.current.source).toEqual({ kind: "all" });
  });

  it("reconhece /folder/5/note/3 como pane editor", () => {
    mockUseLocation.mockReturnValue({ pathname: "/folder/5" });
    mockUseParams.mockReturnValue({ folderId: "5", noteId: "3" });
    const { result } = renderHook(() => useSelection());
    expect(result.current.pane).toBe("editor");
    expect(result.current.noteId).toBe(3);
    expect(result.current.source).toEqual({ kind: "folder", folderId: 5 });
  });
});
