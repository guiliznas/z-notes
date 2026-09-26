import { useState } from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from "react-native";
import type { FolderTreeNode, FolderWithCount } from "@z-notes/shared";
import { useFolders } from "../hooks/useFolders";

interface NoteActionModalProps {
  visible: boolean;
  isArchived: boolean;
  isDeleted: boolean;
  currentFolderId: number | null;
  onClose: () => void;
  onToggleArchive: () => void;
  onMoveToFolder: (folderId: number) => void;
  onTrash: () => void;
  onRestore?: () => void;
  onHardDelete?: () => void;
}

export default function NoteActionModal({
  visible,
  isArchived,
  isDeleted,
  currentFolderId,
  onClose,
  onToggleArchive,
  onMoveToFolder,
  onTrash,
  onRestore,
  onHardDelete,
}: NoteActionModalProps) {
  const [pickingFolder, setPickingFolder] = useState(false);
  const { data: folders } = useFolders();

  const handleClose = () => {
    setPickingFolder(false);
    onClose();
  };

  const handleSelectFolder = (folderId: number) => {
    onMoveToFolder(folderId);
    handleClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          {pickingFolder ? (
            <>
              <Text style={styles.title}>Mover para Pasta</Text>
              <ScrollView style={styles.folderList}>
                {(folders ?? []).map((root: FolderTreeNode) => (
                  <View key={root.id}>
                    <TouchableOpacity
                      style={[
                        styles.folderItem,
                        currentFolderId === root.id && styles.folderItemActive,
                      ]}
                      onPress={() => handleSelectFolder(root.id)}
                    >
                      <Text style={styles.folderIcon}>📁</Text>
                      <Text style={styles.folderName}>{root.name}</Text>
                      {currentFolderId === root.id && (
                        <Text style={styles.checkMark}>✓</Text>
                      )}
                    </TouchableOpacity>
                    {(root.children ?? []).map((sub: FolderWithCount) => (
                      <TouchableOpacity
                        key={sub.id}
                        style={[
                          styles.folderItem,
                          styles.subfolderItem,
                          currentFolderId === sub.id && styles.folderItemActive,
                        ]}
                        onPress={() => handleSelectFolder(sub.id)}
                      >
                        <Text style={styles.folderIcon}>↳ 📁</Text>
                        <Text style={styles.folderName}>{sub.name}</Text>
                        {currentFolderId === sub.id && (
                          <Text style={styles.checkMark}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={[styles.actionBtn, styles.cancelBtn]}
                onPress={() => setPickingFolder(false)}
              >
                <Text style={styles.cancelText}>Voltar</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.title}>Ações da Nota</Text>

              {!isDeleted && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => setPickingFolder(true)}
                >
                  <Text style={styles.actionIcon}>📁</Text>
                  <Text style={styles.actionText}>Mover para pasta...</Text>
                </TouchableOpacity>
              )}

              {!isDeleted && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => {
                    onToggleArchive();
                    handleClose();
                  }}
                >
                  <Text style={styles.actionIcon}>📦</Text>
                  <Text style={styles.actionText}>
                    {isArchived ? "Desarquivar nota" : "Arquivar nota"}
                  </Text>
                </TouchableOpacity>
              )}

              {isDeleted ? (
                <>
                  {onRestore && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => {
                        onRestore();
                        handleClose();
                      }}
                    >
                      <Text style={styles.actionIcon}>♻️</Text>
                      <Text style={styles.actionText}>Restaurar nota</Text>
                    </TouchableOpacity>
                  )}
                  {onHardDelete && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => {
                        onHardDelete();
                        handleClose();
                      }}
                    >
                      <Text style={styles.actionIcon}>⚠️</Text>
                      <Text style={[styles.actionText, styles.destructiveText]}>
                        Excluir definitivamente
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => {
                    onTrash();
                    handleClose();
                  }}
                >
                  <Text style={styles.actionIcon}>🗑️</Text>
                  <Text style={[styles.actionText, styles.destructiveText]}>
                    Mover para lixeira
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.actionBtn, styles.cancelBtn]}
                onPress={handleClose}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  dialog: {
    backgroundColor: "#2c2c2e",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: "80%",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 16,
    textAlign: "center",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#3a3a3c",
    marginBottom: 8,
  },
  actionIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  actionText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "500",
  },
  destructiveText: {
    color: "#ff453a",
  },
  cancelBtn: {
    justifyContent: "center",
    backgroundColor: "transparent",
    marginTop: 6,
  },
  cancelText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
    textAlign: "center",
    width: "100%",
  },
  folderList: {
    maxHeight: 250,
    marginBottom: 12,
  },
  folderItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
  },
  subfolderItem: {
    paddingLeft: 24,
  },
  folderItemActive: {
    backgroundColor: "#3a3a3c",
  },
  folderIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  folderName: {
    fontSize: 15,
    color: "#fff",
    flex: 1,
  },
  checkMark: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
