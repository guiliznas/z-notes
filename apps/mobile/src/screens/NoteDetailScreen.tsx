import { useState, useCallback, useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import Markdown from "react-native-markdown-display";
import { useNote, useTrashNote, useRestoreNote, useHardDeleteNote } from "../hooks/useNotes";
import { useUpdateNote } from "../hooks/useUpdateNote";
import { deriveTitle } from "@z-notes/shared";
import NoteActionModal from "../components/NoteActionModal";
import MarkdownToolbar from "../components/MarkdownToolbar";

interface Props {
  noteId: number;
  onBack: () => void;
}

export default function NoteDetailScreen({ noteId, onBack }: Props) {
  const { data: note, isPending } = useNote(noteId);
  const update = useUpdateNote();
  const trashNote = useTrashNote();
  const restoreNote = useRestoreNote();
  const hardDeleteNote = useHardDeleteNote();

  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState("");
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");

  const versionRef = useRef<number>(0);
  const lastSavedContentRef = useRef<string>("");
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (note) {
      setContent(note.contentMd);
      versionRef.current = note.version;
      lastSavedContentRef.current = note.contentMd;
    }
  }, [note]);

  const performSave = useCallback(
    (textToSave: string, onComplete?: () => void) => {
      setSaveStatus("saving");
      update.mutate(
        { id: noteId, contentMd: textToSave, version: versionRef.current },
        {
          onSuccess: (updated) => {
            versionRef.current = updated.version;
            lastSavedContentRef.current = textToSave;
            setSaveStatus("saved");
            if (onComplete) onComplete();
          },
          onError: (err: unknown) => {
            setSaveStatus("error");
            const msg = err instanceof Error ? err.message : "Erro ao salvar";
            Alert.alert("Erro", msg);
          },
        },
      );
    },
    [noteId, update],
  );

  // Autosave debounced (750ms)
  const handleContentChange = (newText: string) => {
    setContent(newText);
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    if (newText !== lastSavedContentRef.current) {
      setSaveStatus("saving");
      autosaveTimerRef.current = setTimeout(() => {
        performSave(newText);
      }, 750);
    }
  };

  const handleManualSave = useCallback(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    performSave(content, () => setEditing(false));
  }, [content, performSave]);

  const handleInsertMarkdown = (prefix: string, suffix: string = "") => {
    setContent((prev) => {
      const needsNewline = prev.length > 0 && !prev.endsWith("\n") && prefix.startsWith("#");
      const next = `${prev}${needsNewline ? "\n" : ""}${prefix}${suffix ? `texto${suffix}` : ""}`;
      handleContentChange(next);
      return next;
    });
  };

  const handleToggleArchive = () => {
    if (!note) return;
    update.mutate({
      id: noteId,
      archived: !note.archived,
      version: versionRef.current,
    });
  };

  const handleMoveToFolder = (folderId: number) => {
    update.mutate({
      id: noteId,
      folderId,
      version: versionRef.current,
    });
  };

  const handleTrash = () => {
    Alert.alert("Mover para lixeira", "Deseja mover esta nota para a lixeira?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Mover",
        style: "destructive",
        onPress: () => trashNote.mutate(noteId, { onSuccess: onBack }),
      },
    ]);
  };

  const handleRestore = () => {
    restoreNote.mutate(noteId);
  };

  const handleHardDelete = () => {
    Alert.alert(
      "Excluir definitivamente",
      "Esta ação não pode ser desfeita. Tem certeza?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => hardDeleteNote.mutate(noteId, { onSuccess: onBack }),
        },
      ],
    );
  };

  if (isPending)
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Carregando...</Text>
      </View>
    );

  if (!note)
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Nota não encontrada</Text>
      </View>
    );

  const title = deriveTitle(content);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backButton}>← Voltar</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text
            style={[
              styles.saveStatus,
              saveStatus === "saving" && styles.statusSaving,
              saveStatus === "error" && styles.statusError,
            ]}
          >
            {saveStatus === "saving" ? "Salvando..." : saveStatus === "error" ? "Erro" : "Salvo"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setActionModalVisible(true)}
          style={styles.actionMenuBtn}
          accessibilityLabel="Ações da nota"
        >
          <Text style={styles.actionMenuText}>⋯</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => (editing ? handleManualSave() : setEditing(true))}
          accessibilityLabel={editing ? "Salvar nota" : "Editar nota"}
        >
          <Text style={styles.editButton}>{editing ? "✔" : "✏️"}</Text>
        </TouchableOpacity>
      </View>

      {editing ? (
        <>
          <TextInput
            style={styles.editor}
            value={content}
            onChangeText={handleContentChange}
            multiline
            autoFocus
            placeholder="Comece a escrever…"
            placeholderTextColor="#555"
          />
          <MarkdownToolbar onInsert={handleInsertMarkdown} onSave={handleManualSave} />
        </>
      ) : (
        <View style={styles.content}>
          <Markdown>{content || "Toque em ✏️ para editar"}</Markdown>
        </View>
      )}

      <NoteActionModal
        visible={actionModalVisible}
        isArchived={note.archived}
        isDeleted={note.deleted}
        currentFolderId={note.folderId}
        onClose={() => setActionModalVisible(false)}
        onToggleArchive={handleToggleArchive}
        onMoveToFolder={handleMoveToFolder}
        onTrash={handleTrash}
        onRestore={handleRestore}
        onHardDelete={handleHardDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1c1c1e" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#333",
  },
  backButton: { color: "#007AFF", fontSize: 16, marginRight: 12 },
  headerCenter: { flex: 1, marginRight: 8 },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },
  saveStatus: { color: "#30d158", fontSize: 11, marginTop: 1 },
  statusSaving: { color: "#ffd60a" },
  statusError: { color: "#ff453a" },
  actionMenuBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  actionMenuText: { color: "#8e8e93", fontSize: 20, fontWeight: "bold" },
  editButton: { fontSize: 20, paddingLeft: 6 },
  editor: { flex: 1, color: "#fff", fontSize: 15, padding: 16, textAlignVertical: "top" },
  content: { flex: 1, color: "#fff", fontSize: 15, padding: 16, lineHeight: 22 },
  text: { color: "#888", padding: 24, fontSize: 15 },
});
