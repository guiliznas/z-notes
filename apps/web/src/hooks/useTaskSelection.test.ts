import { describe, it, expect } from "vitest";
import { parseTaskSelection, taskFolderPath, TASKS_ARCHIVE_PATH } from "./useTaskSelection";

describe("parseTaskSelection", () => {
  it("reconhece raiz, pasta e arquivadas", () => {
    expect(parseTaskSelection("/tasks")).toEqual({ kind: "none" });
    expect(parseTaskSelection("/tasks/folder/7", "7")).toEqual({ kind: "folder", folderId: 7 });
    expect(parseTaskSelection(TASKS_ARCHIVE_PATH)).toEqual({ kind: "archived" });
  });
  it("id inválido cai em none", () => {
    expect(parseTaskSelection("/tasks/folder/abc", "abc")).toEqual({ kind: "none" });
    expect(parseTaskSelection("/tasks/folder/0", "0")).toEqual({ kind: "none" });
  });
  it("gera o caminho da pasta", () => {
    expect(taskFolderPath(3)).toBe("/tasks/folder/3");
  });
});
