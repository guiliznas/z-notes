import type { NoteViewFilter } from "@z-notes/shared";

export type NoteSource =
  | { kind: "all" }
  | { kind: "archived" }
  | { kind: "trash" }
  | { kind: "folder"; folderId: number };

export function sourceViewFilter(source: NoteSource): NoteViewFilter {
  if (source.kind === "archived") return "archived";
  if (source.kind === "trash") return "trash";
  return "active";
}

export function sourceFolderId(source: NoteSource): number | null {
  return source.kind === "folder" ? source.folderId : null;
}

export function sourcePath(source: NoteSource): string {
  switch (source.kind) {
    case "all":
      return "/all";
    case "archived":
      return "/archived";
    case "trash":
      return "/trash";
    case "folder":
      return `/folder/${source.folderId}`;
  }
}

export function notePath(source: NoteSource, noteId: number): string {
  return `${sourcePath(source)}/note/${noteId}`;
}

/** Chave estável para o cache do React Query. */
export function sourceKey(source: NoteSource): string {
  return source.kind === "folder" ? `folder:${source.folderId}` : source.kind;
}

export function parseSource(pathname: string, folderIdParam?: string): NoteSource {
  if (pathname.startsWith("/archived")) return { kind: "archived" };
  if (pathname.startsWith("/trash")) return { kind: "trash" };
  if (folderIdParam) return { kind: "folder", folderId: Number(folderIdParam) };
  return { kind: "all" };
}
