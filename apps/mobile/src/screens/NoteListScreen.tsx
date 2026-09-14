import { FlatList, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { useNotes } from "../hooks/useNotes";
import type { NoteMeta, NoteViewFilter } from "@z-notes/shared";

interface Props {
  folderId: number | null;
  folderName?: string;
  view?: NoteViewFilter;
  onOpenDrawer?: () => void;
  onSelectNote: (id: number) => void;
  onCreateNote: () => void;
}

export default function NoteListScreen({
  folderId,
  folderName,
  view = "active",
  onOpenDrawer,
  onSelectNote,
  onCreateNote,
}: Props) {
  const { data: notes, isPending } = useNotes(folderId, view);

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

      {isPending && <Text style={styles.loading}>Carregando...</Text>}

      <FlatList
        data={notes}
        keyExtractor={(item: NoteMeta) => String(item.id)}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => onSelectNote(item.id)}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.itemExcerpt} numberOfLines={2}>
              {item.excerpt}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!isPending ? <Text style={styles.empty}>Nenhuma nota</Text> : null}
      />

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
    paddingBottom: 8,
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
  itemTitle: { color: "#fff", fontSize: 16, fontWeight: "600", marginBottom: 2 },
  itemExcerpt: { color: "#888", fontSize: 13, lineHeight: 18 },
  empty: { color: "#888", textAlign: "center", marginTop: 40 },
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
