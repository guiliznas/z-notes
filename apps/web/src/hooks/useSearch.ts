import { useQuery } from "@tanstack/react-query";
import { searchNotes } from "@/api/resources";

export function useSearch(query: string, folderId: number | null) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["search", trimmed, folderId],
    queryFn: () => searchNotes(trimmed, folderId),
    enabled: trimmed.length > 0,
    placeholderData: (prev) => prev,
    staleTime: 5000,
  });
}
