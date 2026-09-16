import { View, TextInput, TouchableOpacity, Text, StyleSheet } from "react-native";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  placeholder?: string;
}

export default function SearchBar({
  value,
  onChangeText,
  onClear,
  placeholder = "Buscar notas...",
}: SearchBarProps) {
  const handleClear = () => {
    onChangeText("");
    if (onClear) onClear();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🔍</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#8e8e93"
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <TouchableOpacity
          style={styles.clearBtn}
          onPress={handleClear}
          accessibilityLabel="Limpar busca"
        >
          <Text style={styles.clearText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2c2c2e",
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 10,
    height: 40,
  },
  icon: {
    fontSize: 14,
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  clearText: {
    color: "#8e8e93",
    fontSize: 16,
    fontWeight: "bold",
  },
});
