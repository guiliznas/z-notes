import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";

interface MarkdownToolbarProps {
  onInsert: (prefix: string, suffix?: string) => void;
  onSave?: () => void;
}

interface Action {
  label: string;
  prefix: string;
  suffix?: string;
  accessibilityLabel: string;
}

const ACTIONS: Action[] = [
  { label: "H1", prefix: "# ", accessibilityLabel: "Título 1" },
  { label: "H2", prefix: "## ", accessibilityLabel: "Título 2" },
  { label: "B", prefix: "**", suffix: "**", accessibilityLabel: "Negrito" },
  { label: "I", prefix: "*", suffix: "*", accessibilityLabel: "Itálico" },
  { label: "[ ]", prefix: "- [ ] ", accessibilityLabel: "Caixa de seleção" },
  { label: "•", prefix: "- ", accessibilityLabel: "Lista" },
  { label: "` `", prefix: "`", suffix: "`", accessibilityLabel: "Código inline" },
  { label: "```", prefix: "```\n", suffix: "\n```", accessibilityLabel: "Bloco de código" },
];

export default function MarkdownToolbar({ onInsert, onSave }: MarkdownToolbarProps) {
  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {ACTIONS.map((act) => (
          <TouchableOpacity
            key={act.label}
            style={styles.btn}
            onPress={() => onInsert(act.prefix, act.suffix)}
            accessibilityLabel={act.accessibilityLabel}
          >
            <Text style={styles.btnText}>{act.label}</Text>
          </TouchableOpacity>
        ))}
        {onSave && (
          <TouchableOpacity
            style={[styles.btn, styles.saveBtn]}
            onPress={onSave}
            accessibilityLabel="Salvar nota"
          >
            <Text style={[styles.btnText, styles.saveBtnText]}>✔</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#2c2c2e",
    borderTopWidth: 0.5,
    borderTopColor: "#3a3a3c",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  scroll: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  btn: {
    backgroundColor: "#3a3a3c",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  saveBtn: {
    backgroundColor: "#007AFF",
    marginLeft: 8,
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
