import { useState } from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from "react-native";
import type { FolderTreeNode, FolderWithCount } from "@z-notes/shared";
import { useFolders } from "../hooks/useFolders";
import Icon from "./Icon";

interface NoteActionModalProps {
  visible: boolean;
  isArchived: boolean;
  isPinned?: boolean;
  isDeleted: boolean;
  currentFolderId: number | null;
  onClose: () => void;
  onToggleArchive: () => void;
  onTogglePin?: () => void;
  onMoveToFolder: (folderId: number) => void;
  onTrash: () => void;
  onRestore?: () => void;
  onHardDelete?: () => void;
}

export default function NoteActionModal({
  visible,
  isArchived,
  isPinned,
  isDeleted,
  currentFolderId,
  onClose,
  onToggleArchive,
  onTogglePin,
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
                      <View style={styles.folderIconSlot}><Icon name="folder" size={16} color="#8e8e93" /></View>
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
                        <View style={styles.subFolderIconSlot}>
                          <Text style={styles.subPrefix}>↳</Text>
                          <Icon name="folder" size={14} color="#8e8e93" />
                        </View>
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
                  <View style={styles.actionIconSlot}><Icon name="folder" size={16} color="#ebebf5" /></View>
                  <Text style={styles.actionText}>Mover para pasta...</Text>
                </TouchableOpacity>
              )}

              {!isDeleted && onTogglePin && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => {
                    onTogglePin();
                    handleClose();
                  }}
                >
                  <View style={styles.actionIconSlot}><Icon name="pin" size={16} color="#ebebf5" /></View>
                  <Text style={styles.actionText}>
                    {isPinned ? "Desafixar nota" : "Fixar nota"}
                  </Text>
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
                  <View style={styles.actionIconSlot}><Icon name="archive" size={16} color="#ebebf5" /></View>
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
                      <View style={styles.actionIconSlot}><Icon name="restore" size={16} color="#ebebf5" /></View>
                      <Text style={styles.actionText}>Restaurar nota</Text>
                    </TouchableOpacity>
                  )}
                  {onHardDelete && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.destructiveBtn]}
                      onPress={() => {
                        onHardDelete();
                        handleClose();
                      }}
                    >
                      <View style={styles.actionIconSlot}><Icon name="warning" size={16} color="#ff453a" /></View>
                      <Text style={[styles.actionText, styles.destructiveText]}>
                        Excluir definitivamente
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.destructiveBtn]}
                  onPress={() => {
                    onTrash();
                    handleClose();
                  }}
                >
                  <View style={styles.actionIconSlot}><Icon name="trash" size={16} color="#ff453a" /></View>
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
    backgroundColor: "#28282a",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: "80%",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#eceff1",
    marginBottom: 16,
    textAlign: "center",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#303032",
    marginBottom: 8,
  },
  destructiveBtn: {
    backgroundColor: "#1c1c1e",
    borderWidth: 1,
    borderColor: "#ff453a",
  },
  actionIconSlot: {
    marginRight: 12,
    width: 20,
    alignItems: "center",
  },
  actionText: {
    fontSize: 16,
    color: "#eceff1",
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
    color: "#ffc107",
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
    backgroundColor: "#303032",
  },
  folderIconSlot: {
    marginRight: 10,
    width: 18,
    alignItems: "center",
  },
  subFolderIconSlot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginRight: 10,
  },
  subPrefix: {
    color: "#b0bec5",
    fontSize: 14,
  },
  folderName: {
    fontSize: 15,
    color: "#eceff1",
    flex: 1,
  },
  checkMark: {
    color: "#ffc107",
    fontSize: 16,
    fontWeight: "bold",
  },
});
