import { useLocation, useParams } from "react-router-dom";

export type TaskSelection =
  | { kind: "none" }
  | { kind: "folder"; folderId: number }
  | { kind: "archived" };

export const TASKS_ROOT = "/tasks";
export const taskFolderPath = (folderId: number) => `${TASKS_ROOT}/folder/${folderId}`;
export const TASKS_ARCHIVE_PATH = `${TASKS_ROOT}/archived`;

export function parseTaskSelection(pathname: string, folderIdParam?: string): TaskSelection {
  if (pathname.startsWith(TASKS_ARCHIVE_PATH)) return { kind: "archived" };
  const id = Number(folderIdParam);
  if (pathname.startsWith(`${TASKS_ROOT}/folder/`) && Number.isInteger(id) && id > 0) {
    return { kind: "folder", folderId: id };
  }
  return { kind: "none" };
}

export function useTaskSelection(): TaskSelection {
  const location = useLocation();
  const params = useParams();
  return parseTaskSelection(location.pathname, params.folderId);
}
