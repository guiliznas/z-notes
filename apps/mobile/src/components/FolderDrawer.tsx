import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  StyleSheet,
} from "react-native";
import type { FolderTreeNode, FolderWithCount, NoteViewFilter } from "@z-notes/shared";
import { useFolders, useCreateFolder, useUpdateFolder, useDeleteFolder } from "../hooks/useFolders";
import FolderModal from "./FolderModal";

interface FolderDrawerProps {
  visible: boolean;
  onClose: () => void;
  selectedFolderId: number | null;
  selectedView: NoteViewFilter;
  onSelectView: (view: NoteViewFilter) => void;
  onSelectFolder: (folderId: number, folderName: string) => void;
  onOpenSettings?: () => void;
}

export default function FolderDrawer({
  visible,
  onClose,
  selectedFolderId,
  selectedView,
  onSelectView,
  onSelectFolder,
  onOpenSettings,
}: FolderDrawerProps) {
  const { data: folders, isPending } = useFolders();
  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingFolder, setEditingFolder] = useState<{ id: number; name: string } | null>(null);
  const [parentFolder, setParentFolder] = useState<{ id: number; name: string } | null>(null);

  const handleOpenCreateRoot = () => {
    setEditingFolder(null);
    setParentFolder(null);
    setModalVisible(true);
  };

  const handleOpenCreateSub = (parent: FolderWithCount) => {
    setEditingFolder(null);
    setParentFolder({ id: parent.id, name: parent.name });
    setModalVisible(true);
  };

  const handleOpenRename = (folder: { id: number; name: string }) => {
    setParentFolder(null);
    setEditingFolder(folder);
    setModalVisible(true);
  };

  const handleSaveModal = (name: string) => {
    if (editingFolder) {
      updateFolder.mutate({ id: editingFolder.id, input: { name } });
    } else if (parentFolder) {
      createFolder.mutate({ name, parentId: parentFolder.id });
    } else {
      createFolder.mutate({ name });
    }
  };

  const handleDelete = (folder: { id: number; name: string }) => {
    Alert.alert(
      "Excluir pasta",
      `Deseja excluir a pasta "${folder.name}"? As notas dela serão movidas para a lixeira.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => deleteFolder.mutate(folder.id),
        },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.container}>
        <View style={styles.drawer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>z-notes</Text>
            <View style={styles.headerActions}>
              {onOpenSettings && (
                <TouchableOpacity
                  style={styles.iconBtn}
                  onPress={() => {
                    onClose();
                    onOpenSettings();
                  }}
                  accessibilityLabel="Configurações"
                >
                  <Text style={styles.iconText}>⚙️</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={onClose}
                accessibilityLabel="Fechar gaveta"
              >
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.content}>
            <Text style={styles.sectionHeader}>Vistas</Text>

            <TouchableOpacity
              style={[
                styles.navItem,
                selectedFolderId === null && selectedView === "active" && styles.navItemActive,
              ]}
              onPress={() => {
                onSelectView("active");
                onClose();
              }}
            >
              <Text style={styles.navIcon}>📝</Text>
              <Text style={styles.navText}>Todas as notas</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navItem,
                selectedFolderId === null && selectedView === "archived" && styles.navItemActive,
              ]}
              onPress={() => {
                onSelectView("archived");
                onClose();
              }}
            >
              <Text style={styles.navIcon}>📦</Text>
              <Text style={styles.navText}>Arquivadas</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.navItem,
                selectedFolderId === null && selectedView === "trash" && styles.navItemActive,
              ]}
              onPress={() => {
                onSelectView("trash");
                onClose();
              }}
            >
              <Text style={styles.navIcon}>🗑️</Text>
              <Text style={styles.navText}>Lixeira</Text>
            </TouchableOpacity>

            <View style={styles.folderSectionHeader}>
              <Text style={styles.sectionHeader}>Pastas</Text>
              <TouchableOpacity onPress={handleOpenCreateRoot} style={styles.addFolderBtn}>
                <Text style={styles.addFolderText}>+ Nova</Text>
              </TouchableOpacity>
            </View>

            {isPending && <Text style={styles.loadingText}>Carregando pastas...</Text>}

            {!isPending && (folders ?? []).length === 0 && (
              <Text style={styles.emptyText}>Nenhuma pasta criada</Text>
            )}

            {(folders ?? []).map((node: FolderTreeNode) => {
              const isRootActive = selectedFolderId === node.id;
              return (
                <View key={node.id} style={styles.treeNode}>
                  <View style={[styles.folderRow, isRootActive && styles.folderRowActive]}>
                    <TouchableOpacity
                      style={styles.folderMain}
                      onPress={() => {
                        onSelectFolder(node.id, node.name);
                        onClose();
                      }}
                    >
                      <Text style={styles.navIcon}>📁</Text>
                      <Text style={styles.folderName} numberOfLines={1}>
                        {node.name}
                      </Text>
                      <Text style={styles.badge}>{node.noteCount}</Text>
                    </TouchableOpacity>

                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleOpenCreateSub(node)}
                        accessibilityLabel={`Adicionar subpasta em ${node.name}`}
                      >
                        <Text style={styles.actionText}>+↳</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleOpenRename(node)}
                        accessibilityLabel={`Renomear ${node.name}`}
                      >
                        <Text style={styles.actionText}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleDelete(node)}
                        accessibilityLabel={`Excluir ${node.name}`}
                      >
                        <Text style={styles.actionText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {(node.children ?? []).map((child: FolderWithCount) => {
                    const isChildActive = selectedFolderId === child.id;
                    return (
                      <View
                        key={child.id}
                        style={[
                          styles.folderRow,
                          styles.subfolderRow,
                          isChildActive && styles.folderRowActive,
                        ]}
                      >
                        <TouchableOpacity
                          style={styles.folderMain}
                          onPress={() => {
                            onSelectFolder(child.id, child.name);
                            onClose();
                          }}
                        >
                          <Text style={styles.subIcon}>↳ 📁</Text>
                          <Text style={styles.folderName} numberOfLines={1}>
                            {child.name}
                          </Text>
                          <Text style={styles.badge}>{child.noteCount}</Text>
                        </TouchableOpacity>

                        <View style={styles.actions}>
                          <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => handleOpenRename(child)}
                            accessibilityLabel={`Renomear ${child.name}`}
                          >
                            <Text style={styles.actionText}>✏️</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => handleDelete(child)}
                            accessibilityLabel={`Excluir ${child.name}`}
                          >
                            <Text style={styles.actionText}>🗑️</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </ScrollView>
        </View>

        <FolderModal
          visible={modalVisible}
          initialName={editingFolder?.name ?? ""}
          parentName={parentFolder?.name ?? null}
          onSave={handleSaveModal}
          onClose={() => setModalVisible(false)}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    flexDirection: "row",
  },
  drawer: {
    width: "82%",
    maxWidth: 340,
    backgroundColor: "#1c1c1e",
    height: "100%",
    paddingTop: 48,
    borderRightWidth: 0.5,
    borderRightColor: "#333",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: "#2c2c2e",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBtn: {
    padding: 6,
  },
  iconText: {
    fontSize: 18,
  },
  closeText: {
    color: "#888",
    fontSize: 20,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  sectionHeader: {
    color: "#8e8e93",
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 6,
    paddingHorizontal: 8,
  },
  folderSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  addFolderBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  addFolderText: {
    color: "#007AFF",
    fontSize: 13,
    fontWeight: "600",
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 2,
  },
  navItemActive: {
    backgroundColor: "#2c2c2e",
  },
  navIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  subIcon: {
    fontSize: 14,
    marginRight: 6,
    color: "#888",
  },
  navText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
  },
  treeNode: {
    marginBottom: 4,
  },
  folderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  subfolderRow: {
    paddingLeft: 24,
  },
  folderRowActive: {
    backgroundColor: "#2c2c2e",
  },
  folderMain: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  folderName: {
    color: "#fff",
    fontSize: 15,
    flex: 1,
  },
  badge: {
    color: "#8e8e93",
    fontSize: 12,
    marginLeft: 6,
    marginRight: 6,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionBtn: {
    padding: 4,
  },
  actionText: {
    fontSize: 14,
    color: "#8e8e93",
  },
  loadingText: {
    color: "#8e8e93",
    padding: 12,
    fontSize: 14,
  },
  emptyText: {
    color: "#636366",
    padding: 12,
    fontSize: 13,
  },
});
