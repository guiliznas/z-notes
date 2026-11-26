import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import type { FolderTreeNode, Note } from "@z-notes/shared";
import { createNoteForFolder } from "./createNoteFlow";
import * as resources from "../api/resources";

vi.mock("../api/resources", () => ({
  fetchFolders: vi.fn(),
  createFolder: vi.fn(),
  createNote: vi.fn(),
}));

const sampleNote: Note = {
  id: 42,
  folderId: 7,
  title: "",
  excerpt: "",
  contentMd: "",
  pinned: false,
  archived: false,
  deleted: false,
  version: 1,
  createdAt: 1000,
  updatedAt: 1000,
};

const sampleFolder: FolderTreeNode = {
  id: 7,
  name: "Pessoal",
  parentId: null,
  position: 0,
  noteCount: 0,
  createdAt: 1000,
  updatedAt: 1000,
  children: [],
};

describe("createNoteForFolder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("usa a pasta selecionada quando folderId não é null e invalida cache", async () => {
    const client = new QueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    vi.mocked(resources.createNote).mockResolvedValue({ ...sampleNote, folderId: 9 });

    const note = await createNoteForFolder(client, 9);

    expect(note.id).toBe(42);
    expect(resources.fetchFolders).not.toHaveBeenCalled();
    expect(resources.createFolder).not.toHaveBeenCalled();
    expect(resources.createNote).toHaveBeenCalledWith({ folderId: 9 });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["notes"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["folders"] });
  });

  it("em Todas as notas (folderId null), usa a primeira pasta em cache do usuário", async () => {
    const client = new QueryClient();
    client.setQueryData<FolderTreeNode[]>(["folders"], [sampleFolder]);
    vi.mocked(resources.createNote).mockResolvedValue(sampleNote);

    const note = await createNoteForFolder(client, null);

    expect(note.folderId).toBe(7);
    expect(resources.fetchFolders).not.toHaveBeenCalled();
    expect(resources.createFolder).not.toHaveBeenCalled();
    expect(resources.createNote).toHaveBeenCalledWith({ folderId: 7 });
  });

  it("em Todas as notas sem cache de pastas, busca no servidor e usa a primeira pasta", async () => {
    const client = new QueryClient();
    vi.mocked(resources.fetchFolders).mockResolvedValue([sampleFolder]);
    vi.mocked(resources.createNote).mockResolvedValue(sampleNote);

    await createNoteForFolder(client, null);

    expect(resources.fetchFolders).toHaveBeenCalledTimes(1);
    expect(resources.createFolder).not.toHaveBeenCalled();
    expect(resources.createNote).toHaveBeenCalledWith({ folderId: 7 });
  });

  it("cria a pasta padrão 'Notas' quando o usuário não tem nenhuma pasta", async () => {
    const client = new QueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    vi.mocked(resources.fetchFolders).mockResolvedValue([]);
    vi.mocked(resources.createFolder).mockResolvedValue({
      id: 15,
      name: "Notas",
      parentId: null,
      position: 0,
      createdAt: 1000,
      updatedAt: 1000,
    });
    vi.mocked(resources.createNote).mockResolvedValue({ ...sampleNote, folderId: 15 });

    const note = await createNoteForFolder(client, null);

    expect(resources.createFolder).toHaveBeenCalledWith({ name: "Notas" });
    expect(resources.createNote).toHaveBeenCalledWith({ folderId: 15 });
    expect(note.folderId).toBe(15);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["notes"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["folders"] });
  });
});
