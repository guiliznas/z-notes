import { useState } from "react";
import {
  FlatList,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  StyleSheet,
} from "react-native";
import type { NoteMeta, SearchHit, NoteViewFilter } from "@z-notes/shared";
import { useNotes } from "../hooks/useNotes";
import { useSearch } from "../hooks/useSearch";
import SearchBar from "../components/SearchBar";

interface Props {
  folderId: number | null;
  folderName?: string;
  view?: NoteViewFilter;
  onOpenDrawer?: () => void;
  onSelectNote: (id: number) => void;
  onCreateNote: () => void;
}

export function formatNoteDate(timestamp?: number): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const isSameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isSameDay) {
    const hours = String(date.getHours()).padStart(2, "0");
    const mins = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${mins}`;
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  if (date.getFullYear() === now.getFullYear()) {
    return `${day}/${month}`;
  }
  return `${day}/${month}/${date.getFullYear()}`;
}

export default function NoteListScreen({
  folderId,
  folderName,
  view = "active",
  onOpenDrawer,
  onSelectNote,
  onCreateNote,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const isSearching = searchQuery.trim().length > 0;

  const { data: notes, isPending, refetch, isRefetching } = useNotes(folderId, view);
  const { data: searchHits, isPending: searchPending } = useSearch(searchQuery, folderId);

  const getHeaderTitle = () => {
    if (view === "trash") return "Lixeira";
    if (view === "archived") return "Arquivadas";
    if (folderName) return folderName;
    if (folderId !== null) return `Pasta ${folderId}`;
    return "Todas as notas";
  };

  const isTrash = view === "trash";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {onOpenDrawer && (
          <TouchableOpacity
            style={styles.menuButton}
            onPress={onOpenDrawer}
            accessibilityLabel="Abrir gaveta de pastas"
          >
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
        )}
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{getHeaderTitle()}</Text>
          {isTrash && (
            <Text style={styles.trashNotice}>Notas na lixeira são somente-leitura</Text>
          )}
        </View>
      </View>

      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={folderName ? `Buscar em ${folderName}...` : "Buscar em todas as notas..."}
      />

      {isSearching ? (
        <>
          {searchPending && <Text style={styles.loading}>Buscando notas...</Text>}
          <FlatList
            data={searchHits ?? []}
            keyExtractor={(item: SearchHit) => `search-${item.note.id}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.item}
                onPress={() => onSelectNote(item.note.id)}
              >
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.note.title}
                  </Text>
                  {item.note.updatedAt && (
                    <Text style={styles.itemDate}>
                      {formatNoteDate(item.note.updatedAt)}
                    </Text>
                  )}
                </View>
                <Text style={styles.itemExcerpt} numberOfLines={2}>
                  {item.snippet || item.note.excerpt}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              !searchPending ? (
                <Text style={styles.empty}>
                  Nenhum resultado encontrado para "{searchQuery.trim()}"
                </Text>
              ) : null
            }
          />
        </>
      ) : (
        <>
          {isPending && <Text style={styles.loading}>Carregando...</Text>}
          <FlatList
            data={notes}
            keyExtractor={(item: NoteMeta) => String(item.id)}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
            }
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.item} onPress={() => onSelectNote(item.id)}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.updatedAt && (
                    <Text style={styles.itemDate}>{formatNoteDate(item.updatedAt)}</Text>
                  )}
                </View>
                <Text style={styles.itemExcerpt} numberOfLines={2}>
                  {item.excerpt}
                </Text>
                {item.archived && view !== "archived" && (
                  <Text style={styles.archivedBadge}>📦 Arquivada</Text>
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={!isPending ? <Text style={styles.empty}>Nenhuma nota</Text> : null}
          />
        </>
      )}

      {!isTrash && (
        <TouchableOpacity
          style={styles.fab}
          onPress={onCreateNote}
          accessibilityLabel="Criar nota"
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1c1c1e" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
  },
  menuButton: {
    padding: 8,
    marginRight: 8,
  },
  menuIcon: {
    color: "#007AFF",
    fontSize: 22,
  },
  titleContainer: {
    flex: 1,
  },
  title: { fontSize: 22, fontWeight: "700", color: "#fff" },
  trashNotice: { color: "#ff453a", fontSize: 12, marginTop: 2 },
  loading: { color: "#888", padding: 16 },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#333",
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  itemTitle: { color: "#fff", fontSize: 16, fontWeight: "600", flex: 1, marginRight: 8 },
  itemDate: { color: "#8e8e93", fontSize: 12 },
  itemExcerpt: { color: "#888", fontSize: 13, lineHeight: 18 },
  archivedBadge: { color: "#ff9f0a", fontSize: 11, marginTop: 4 },
  empty: { color: "#888", textAlign: "center", marginTop: 40, paddingHorizontal: 24 },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#007AFF",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  fabText: { color: "#fff", fontSize: 28, lineHeight: 30 },
});
