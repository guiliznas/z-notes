import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet } from "react-native";

interface FolderModalProps {
  visible: boolean;
  initialName?: string;
  parentName?: string | null;
  onSave: (name: string) => void;
  onClose: () => void;
}

export default function FolderModal({
  visible,
  initialName = "",
  parentName,
  onSave,
  onClose,
}: FolderModalProps) {
  const [name, setName] = useState(initialName);

  useEffect(() => {
    setName(initialName);
  }, [initialName, visible]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setName("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>
            {initialName ? "Renomear Pasta" : parentName ? `Nova Subpasta em "${parentName}"` : "Nova Pasta"}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Nome da pasta"
            placeholderTextColor="#888"
            value={name}
            onChangeText={setName}
            autoFocus
          />
          <View style={styles.buttons}>
            <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.saveBtn]} onPress={handleSave}>
              <Text style={styles.saveText}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  dialog: {
    width: "100%",
    backgroundColor: "#2c2c2e",
    borderRadius: 14,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#1c1c1e",
    color: "#fff",
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 20,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelBtn: {
    backgroundColor: "#3a3a3c",
  },
  cancelText: {
    color: "#ebebf5",
    fontSize: 15,
  },
  saveBtn: {
    backgroundColor: "#007AFF",
  },
  saveText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
