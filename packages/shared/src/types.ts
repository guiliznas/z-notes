export interface Folder {
  id: number;
  name: string;
  parentId: number | null;
  position: number;
  createdAt: number;
  updatedAt: number;
}

export interface FolderWithCount extends Folder {
  /** notas ativas (não arquivadas, não excluídas) na pasta. */
  noteCount: number;
}

/** Pasta raiz com suas subpastas (1 nível), todas com contagem de notas. */
export interface FolderTreeNode extends FolderWithCount {
  children: FolderWithCount[];
}

/** Metadados leves de uma nota, para listagens. Sem o corpo completo. */
export interface NoteMeta {
  id: number;
  /** null = nota órfã na lixeira (pasta original foi excluída). */
  folderId: number | null;
  title: string;
  excerpt: string;
  archived: boolean;
  deleted: boolean;
  createdAt: number;
  updatedAt: number;
}

/** Nota completa, com corpo markdown e versão para controle de concorrência. */
export interface Note extends NoteMeta {
  contentMd: string;
  version: number;
}

export interface SearchHit {
  note: NoteMeta;
  snippet: string;
}

export type NoteViewFilter = "active" | "archived" | "trash";

export interface CreateFolderInput {
  name: string;
  parentId?: number | null;
}

export interface UpdateFolderInput {
  name?: string;
  parentId?: number | null;
  position?: number;
}

export interface CreateNoteInput {
  folderId: number;
  contentMd?: string;
}

export interface UpdateNoteInput {
  contentMd?: string;
  /** versão que o client acredita ser a atual; usada para detectar conflito. */
  version?: number;
  folderId?: number;
  archived?: boolean;
}

export interface LoginInput {
  password: string;
}

export interface ApiError {
  error: string;
  message: string;
}
