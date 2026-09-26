import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  fetchNotes,
  fetchNote,
  createNote,
  updateNote,
  trashNote,
  hardDeleteNote,
  restoreNote,
  searchNotes,
  authMe,
  authLogout,
  fetchAdminMetrics,
  importFiles,
} from "./resources";

const mockApi = vi.hoisted(() => vi.fn());

vi.mock("./http", () => ({ api: mockApi }));

beforeEach(() => {
  mockApi.mockClear();
});

describe("folders", () => {
  it("fetchFolders", () => {
    fetchFolders();
    expect(mockApi).toHaveBeenCalledWith("/folders");
  });

  it("createFolder", () => {
    createFolder({ name: "teste" });
    expect(mockApi).toHaveBeenCalledWith("/folders", { method: "POST", body: JSON.stringify({ name: "teste" }) });
  });

  it("updateFolder", () => {
    updateFolder(1, { name: "renomeado" });
    expect(mockApi).toHaveBeenCalledWith("/folders/1", { method: "PATCH", body: JSON.stringify({ name: "renomeado" }) });
  });

  it("deleteFolder", () => {
    deleteFolder(3);
    expect(mockApi).toHaveBeenCalledWith("/folders/3", { method: "DELETE" });
  });
});

describe("notes", () => {
  it("fetchNotes com folderId", () => {
    fetchNotes({ folderId: 2, view: "active" });
    expect(mockApi).toHaveBeenCalledWith("/notes?view=active&folder=2");
  });

  it("fetchNotes sem folderId", () => {
    fetchNotes({ folderId: null, view: "trash" });
    expect(mockApi).toHaveBeenCalledWith("/notes?view=trash");
  });

  it("fetchNote", () => {
    fetchNote(5);
    expect(mockApi).toHaveBeenCalledWith("/notes/5");
  });

  it("createNote", () => {
    createNote({ folderId: 1, contentMd: "titulo" });
    expect(mockApi).toHaveBeenCalledWith("/notes", { method: "POST", body: JSON.stringify({ folderId: 1, contentMd: "titulo" }) });
  });

  it("updateNote", () => {
    updateNote(3, { contentMd: "novo" });
    expect(mockApi).toHaveBeenCalledWith("/notes/3", { method: "PATCH", body: JSON.stringify({ contentMd: "novo" }) });
  });

  it("trashNote", () => {
    trashNote(7);
    expect(mockApi).toHaveBeenCalledWith("/notes/7", { method: "DELETE" });
  });

  it("hardDeleteNote", () => {
    hardDeleteNote(7);
    expect(mockApi).toHaveBeenCalledWith("/notes/7?hard=true", { method: "DELETE" });
  });

  it("restoreNote", () => {
    restoreNote(2);
    expect(mockApi).toHaveBeenCalledWith("/notes/2/restore", { method: "POST" });
  });
});

describe("search", () => {
  it("searchNotes com folderId", () => {
    searchNotes("teste", 1);
    expect(mockApi).toHaveBeenCalledWith("/search?q=teste&folder=1");
  });

  it("searchNotes sem folderId", () => {
    searchNotes("algo", null);
    expect(mockApi).toHaveBeenCalledWith("/search?q=algo");
  });
});

describe("auth & admin", () => {
  it("authMe", () => {
    authMe();
    expect(mockApi).toHaveBeenCalledWith("/auth/me");
  });

  it("authLogout", () => {
    authLogout();
    expect(mockApi).toHaveBeenCalledWith("/auth/logout", { method: "POST" });
  });

  it("fetchAdminMetrics", () => {
    fetchAdminMetrics();
    expect(mockApi).toHaveBeenCalledWith("/admin/metrics");
  });
});

describe("import/export", () => {
  it("importFiles monta FormData", () => {
    const file = new File(["conteudo"], "nota.md", { type: "text/markdown" });
    importFiles([file]);
    expect(mockApi).toHaveBeenCalledWith("/import", { method: "POST", body: expect.any(FormData) });
  });
});
