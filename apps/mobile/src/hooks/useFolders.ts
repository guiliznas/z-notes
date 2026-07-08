import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateFolderInput, UpdateFolderInput } from "@z-notes/shared";
import { fetchFolders, createFolder, updateFolder, deleteFolder } from "../api/resources";

export const FOLDERS_KEY = ["folders"] as const;

export function useFolders() {
  return useQuery({ queryKey: FOLDERS_KEY, queryFn: fetchFolders });
}

export function useCreateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFolderInput) => createFolder(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: FOLDERS_KEY }),
  });
}

export function useUpdateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateFolderInput }) => updateFolder(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FOLDERS_KEY });
      qc.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteFolder(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FOLDERS_KEY });
      qc.invalidateQueries({ queryKey: ["notes"] });
    },
  });
}