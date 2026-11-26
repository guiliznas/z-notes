import { View, TextInput, TouchableOpacity, Text, StyleSheet } from "react-native";
import Icon from "./Icon";

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
      <View style={styles.iconSlot}>
        <Icon name="search" size={15} color="#b0bec5" />
      </View>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#b0bec5"
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
    backgroundColor: "#28282a",
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 10,
    height: 40,
  },
  iconSlot: {
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    color: "#eceff1",
    fontSize: 15,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  clearText: {
    color: "#b0bec5",
    fontSize: 16,
    fontWeight: "bold",
  },
});
