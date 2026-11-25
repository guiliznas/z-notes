import { useState, useCallback, useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import Markdown from "react-native-markdown-display";
import { useNote, useTrashNote, useRestoreNote, useHardDeleteNote } from "../hooks/useNotes";
import { useUpdateNote } from "../hooks/useUpdateNote";
import { deriveTitle } from "@z-notes/shared";
import NoteActionModal from "../components/NoteActionModal";
import MarkdownToolbar from "../components/MarkdownToolbar";
import Icon from "../components/Icon";

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

  const handleTogglePin = () => {
    if (!note) return;
    update.mutate({
      id: noteId,
      pinned: !note.pinned,
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
  const isEditing = editing && !note.deleted;

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
        {!note.deleted && (
          <TouchableOpacity
            onPress={() => (isEditing ? handleManualSave() : setEditing(true))}
            accessibilityLabel={isEditing ? "Salvar nota" : "Editar nota"}
            style={styles.editButton}
          >
            {isEditing ? (
              <Text style={styles.saveIconText}>✔</Text>
            ) : (
              <Icon name="edit" size={18} color="#ebebf5" />
            )}
          </TouchableOpacity>
        )}
      </View>

      {isEditing ? (
        <>
          <TextInput
            style={styles.editor}
            value={content}
            onChangeText={handleContentChange}
            multiline
            autoFocus
            placeholder="Comece a escrever…"
            placeholderTextColor="#b0bec5"
          />
          <MarkdownToolbar onInsert={handleInsertMarkdown} onSave={handleManualSave} />
        </>
      ) : (
        <View style={styles.content}>
          <Markdown style={markdownStyles}>
            {content || (note.deleted ? "Nota na lixeira (somente leitura)" : "Toque em Editar para começar")}
          </Markdown>
        </View>
      )}

      <NoteActionModal
        visible={actionModalVisible}
        isArchived={note.archived}
        isPinned={note.pinned}
        isDeleted={note.deleted}
        currentFolderId={note.folderId}
        onClose={() => setActionModalVisible(false)}
        onToggleArchive={handleToggleArchive}
        onTogglePin={handleTogglePin}
        onMoveToFolder={handleMoveToFolder}
        onTrash={handleTrash}
        onRestore={handleRestore}
        onHardDelete={handleHardDelete}
      />
    </View>
  );
}

const markdownStyles = StyleSheet.create({
  body: { color: "#eceff1", fontSize: 15, lineHeight: 22 },
  heading1: { color: "#eceff1", fontSize: 24, fontWeight: "700", lineHeight: 30, marginTop: 4, marginBottom: 8 },
  heading2: { color: "#eceff1", fontSize: 20, fontWeight: "600", lineHeight: 26, marginTop: 14, marginBottom: 6 },
  heading3: { color: "#eceff1", fontSize: 17, fontWeight: "600", lineHeight: 23, marginTop: 12, marginBottom: 4 },
  blockquote: {
    backgroundColor: "#28282a",
    borderLeftColor: "#414144",
    borderLeftWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginVertical: 8,
  },
  code_inline: {
    backgroundColor: "#28282a",
    color: "#eceff1",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fence: {
    backgroundColor: "#28282a",
    color: "#eceff1",
    borderColor: "#414144",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  code_block: {
    backgroundColor: "#28282a",
    color: "#eceff1",
    borderColor: "#414144",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  hr: { backgroundColor: "#414144", height: 1, marginVertical: 14 },
  link: { color: "#ffc107", textDecorationLine: "underline" },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1c1c1e" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#414144",
  },
  backButton: { color: "#ffc107", fontSize: 16, marginRight: 12, fontWeight: "600" },
  headerCenter: { flex: 1, marginRight: 8 },
  headerTitle: { color: "#eceff1", fontSize: 16, fontWeight: "600" },
  saveStatus: { color: "#30d158", fontSize: 11, marginTop: 1 },
  statusSaving: { color: "#ffc107" },
  statusError: { color: "#ff453a" },
  actionMenuBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  actionMenuText: { color: "#b0bec5", fontSize: 20, fontWeight: "bold" },
  editButton: { paddingLeft: 6, paddingVertical: 4 },
  saveIconText: { color: "#30d158", fontSize: 18, fontWeight: "700" },
  editor: { flex: 1, color: "#eceff1", fontSize: 15, padding: 16, textAlignVertical: "top" },
  content: { flex: 1, padding: 16 },
  text: { color: "#b0bec5", padding: 24, fontSize: 15 },
});
