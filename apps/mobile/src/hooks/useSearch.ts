import { useQuery } from "@tanstack/react-query";
import type { SearchHit } from "@z-notes/shared";
import { searchNotes } from "../api/resources";

export function useSearch(query: string, folderId: number | null = null) {
  const trimmed = query.trim();
  return useQuery<SearchHit[]>({
    queryKey: ["search", folderId, trimmed],
    queryFn: () => searchNotes(trimmed, folderId),
    enabled: trimmed.length > 0,
  });
}
