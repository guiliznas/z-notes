import { FlatList, Text, TouchableOpacity, View, StyleSheet } from "react-native";
import { useNotes } from "../hooks/useNotes";
import type { NoteMeta } from "@z-notes/shared";

interface Props {
  folderId: number | null;
  onSelectNote: (id: number) => void;
  onCreateNote: () => void;
}

export default function NoteListScreen({ folderId, onSelectNote, onCreateNote }: Props) {
  const { data: notes, isPending } = useNotes(folderId);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {folderId ? `Pasta ${folderId}` : "Todas as notas"}
      </Text>
      {isPending && <Text style={styles.loading}>Carregando...</Text>}
      <FlatList
        data={notes}
        keyExtractor={(item: NoteMeta) => String(item.id)}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => onSelectNote(item.id)}>
            <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.itemExcerpt} numberOfLines={2}>{item.excerpt}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!isPending ? <Text style={styles.empty}>Nenhuma nota</Text> : null}
      />
      <TouchableOpacity style={styles.fab} onPress={onCreateNote}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1c1c1e" },
  title: { fontSize: 22, fontWeight: "700", color: "#fff", padding: 16, paddingBottom: 8 },
  loading: { color: "#888", padding: 16 },
  item: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: "#333" },
  itemTitle: { color: "#fff", fontSize: 16, fontWeight: "600", marginBottom: 2 },
  itemExcerpt: { color: "#888", fontSize: 13, lineHeight: 18 },
  empty: { color: "#888", textAlign: "center", marginTop: 40 },
  fab: {
    position: "absolute", bottom: 24, right: 24,
    backgroundColor: "#007AFF", width: 56, height: 56, borderRadius: 28,
    justifyContent: "center", alignItems: "center",
    elevation: 4,
  },
  fabText: { color: "#fff", fontSize: 28, lineHeight: 30 },
});