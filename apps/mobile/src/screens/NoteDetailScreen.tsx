import { useState, useCallback, useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import Markdown from "react-native-markdown-display";
import { useNote } from "../hooks/useNotes";
import { useUpdateNote } from "../hooks/useUpdateNote";
import { deriveTitle } from "@z-notes/shared";

interface Props {
  noteId: number;
  onBack: () => void;
}

export default function NoteDetailScreen({ noteId, onBack }: Props) {
  const { data: note, isPending } = useNote(noteId);
  const update = useUpdateNote();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState("");
  const versionRef = useRef<number>(0);

  useEffect(() => {
    if (note) {
      setContent(note.contentMd);
      versionRef.current = note.version;
    }
  }, [note]);

  const handleSave = useCallback(() => {
    update.mutate(
      { id: noteId, contentMd: content, version: versionRef.current },
      {
        onSuccess: (updated) => {
          versionRef.current = updated.version;
          setEditing(false);
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : "Erro ao salvar";
          Alert.alert("Erro", msg);
        },
      },
    );
  }, [noteId, content]);

  if (isPending) return <View style={styles.container}><Text style={styles.text}>Carregando...</Text></View>;
  if (!note) return <View style={styles.container}><Text style={styles.text}>Nota não encontrada</Text></View>;

  const title = deriveTitle(content);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}><Text style={styles.backButton}>← Voltar</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <TouchableOpacity onPress={() => editing ? handleSave() : setEditing(true)}>
          <Text style={styles.editButton}>{editing ? "✔" : "✏️"}</Text>
        </TouchableOpacity>
      </View>
      {editing ? (
        <TextInput
          style={styles.editor}
          value={content}
          onChangeText={setContent}
          multiline
          autoFocus
          placeholder="Comece a escrever…"
          placeholderTextColor="#555"
        />
      ) : (
        <View style={styles.content}>
          <Markdown>{content || "Toque em ✏️ para editar"}</Markdown>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1c1c1e" },
  header: { flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: 0.5, borderBottomColor: "#333" },
  backButton: { color: "#007AFF", fontSize: 16, marginRight: 12 },
  headerTitle: { flex: 1, color: "#fff", fontSize: 16, fontWeight: "600" },
  editButton: { fontSize: 20, paddingLeft: 12 },
  editor: { flex: 1, color: "#fff", fontSize: 15, padding: 16, textAlignVertical: "top" },
  content: { flex: 1, color: "#fff", fontSize: 15, padding: 16, lineHeight: 22 },
  text: { color: "#888", padding: 24, fontSize: 15 },
});