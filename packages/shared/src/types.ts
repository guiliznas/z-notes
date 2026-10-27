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
  /** fixada: aparece na pasta virtual "Fixadas" e com alfinete nas listas. */
  pinned: boolean;
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

/** "pinned" = notas ativas fixadas, de todas as pastas. */
export type NoteViewFilter = "active" | "archived" | "trash" | "pinned";

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
  pinned?: boolean;
}

export interface PublicUser {
  id: number;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
}

export interface MetricSample {
  t: number;
  v: number;
}

export type MetricsResponse = { series: Record<string, MetricSample[]> };

export type AuthMeResponse = { authenticated: false } | { authenticated: true; user: PublicUser };

export interface ApiError {
  error: string;
  message: string;
}
