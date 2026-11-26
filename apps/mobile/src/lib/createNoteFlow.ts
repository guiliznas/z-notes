import type { QueryClient } from "@tanstack/react-query";
import type { FolderTreeNode, Note } from "@z-notes/shared";
import { createFolder, createNote, fetchFolders } from "../api/resources";

/**
 * Resolve a pasta de destino e cria uma nova nota:
 * - se uma pasta estiver selecionada, cria nela;
 * - em "Todas as notas" (`selectedFolderId === null`), usa a primeira pasta do usuário
 *   (cache ou servidor) ou cria a pasta padrão "Notas" se ele ainda não tiver nenhuma;
 * - invalida as queries de notas e pastas para refletir a criação na lista e na gaveta.
 */
export async function createNoteForFolder(
  client: QueryClient,
  selectedFolderId: number | null,
): Promise<Note> {
  let targetFolderId = selectedFolderId;

  if (targetFolderId === null) {
    let folders = client.getQueryData<FolderTreeNode[]>(["folders"]);
    if (!folders || folders.length === 0) {
      folders = await fetchFolders();
    }
    if (folders.length > 0) {
      targetFolderId = folders[0].id;
    } else {
      const createdFolder = await createFolder({ name: "Notas" });
      targetFolderId = createdFolder.id;
    }
  }

  const note = await createNote({ folderId: targetFolderId });
  await Promise.all([
    client.invalidateQueries({ queryKey: ["notes"] }),
    client.invalidateQueries({ queryKey: ["folders"] }),
  ]);
  return note;
}
