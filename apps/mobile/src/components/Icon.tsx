import { View, Text } from "react-native";

export type IconName =
  | "pin"
  | "archive"
  | "folder"
  | "settings"
  | "note"
  | "trash"
  | "edit"
  | "restore"
  | "warning"
  | "search";

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

// Ícones desenhados com Views (sem dependência extra nem emoji).
export default function Icon({ name, size = 16, color = "#8e8e93" }: IconProps) {
  const stroke = Math.max(1.5, size / 10);
  const box = {
    width: size,
    height: size,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  };

  if (name === "pin") {
    return (
      <View accessibilityLabel="Fixada" style={box}>
        <View style={{ width: size * 0.55, height: size * 0.55, borderRadius: size, backgroundColor: color }} />
        <View style={{ width: stroke, height: size * 0.4, backgroundColor: color }} />
      </View>
    );
  }
  if (name === "archive") {
    return (
      <View accessibilityLabel="Arquivada" style={box}>
        <View style={{ width: size, height: size * 0.28, borderWidth: stroke, borderColor: color, borderRadius: 2 }} />
        <View
          style={{
            width: size * 0.84,
            height: size * 0.55,
            borderWidth: stroke,
            borderTopWidth: 0,
            borderColor: color,
            borderBottomLeftRadius: 2,
            borderBottomRightRadius: 2,
          }}
        />
      </View>
    );
  }
  if (name === "settings") {
    return (
      <View accessibilityLabel="Configurações" style={box}>
        <View
          style={{
            width: size * 0.78,
            height: size * 0.78,
            borderRadius: size,
            borderWidth: stroke * 1.4,
            borderColor: color,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View style={{ width: size * 0.24, height: size * 0.24, borderRadius: size, backgroundColor: color }} />
        </View>
      </View>
    );
  }
  if (name === "note") {
    return (
      <View accessibilityLabel="Notas" style={box}>
        <View
          style={{
            width: size * 0.76,
            height: size * 0.9,
            borderWidth: stroke,
            borderColor: color,
            borderRadius: 2,
            justifyContent: "space-evenly",
            paddingHorizontal: size * 0.12,
          }}
        >
          <View style={{ height: stroke, backgroundColor: color }} />
          <View style={{ height: stroke, width: "70%", backgroundColor: color }} />
        </View>
      </View>
    );
  }
  if (name === "trash") {
    return (
      <View accessibilityLabel="Lixeira" style={box}>
        <View style={{ width: size * 0.85, height: stroke, backgroundColor: color, marginBottom: 1.5 }} />
        <View
          style={{
            width: size * 0.68,
            height: size * 0.68,
            borderWidth: stroke,
            borderTopWidth: 0,
            borderColor: color,
            borderBottomLeftRadius: 2,
            borderBottomRightRadius: 2,
          }}
        />
      </View>
    );
  }
  if (name === "edit") {
    return (
      <View accessibilityLabel="Editar" style={box}>
        <View
          style={{
            width: size * 0.72,
            height: stroke * 1.4,
            backgroundColor: color,
            borderRadius: 1,
            transform: [{ rotate: "-45deg" }],
          }}
        />
      </View>
    );
  }
  if (name === "restore") {
    return (
      <View accessibilityLabel="Restaurar" style={box}>
        <View
          style={{
            width: size * 0.76,
            height: size * 0.76,
            borderRadius: size,
            borderWidth: stroke,
            borderColor: color,
            borderRightColor: "transparent",
          }}
        />
      </View>
    );
  }
  if (name === "warning") {
    return (
      <View accessibilityLabel="Aviso" style={box}>
        <View
          style={{
            width: size * 0.84,
            height: size * 0.84,
            borderRadius: size,
            borderWidth: stroke,
            borderColor: color,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color, fontSize: size * 0.56, fontWeight: "700", lineHeight: size * 0.62 }}>!</Text>
        </View>
      </View>
    );
  }
  if (name === "search") {
    return (
      <View accessibilityLabel="Buscar" style={box}>
        <View
          style={{
            width: size * 0.62,
            height: size * 0.62,
            borderRadius: size,
            borderWidth: stroke,
            borderColor: color,
            transform: [{ translateX: -1 }, { translateY: -1 }],
          }}
        />
        <View
          style={{
            position: "absolute",
            right: size * 0.14,
            bottom: size * 0.14,
            width: size * 0.3,
            height: stroke,
            backgroundColor: color,
            transform: [{ rotate: "45deg" }],
          }}
        />
      </View>
    );
  }
  // folder
  return (
    <View accessibilityLabel="Pasta" style={box}>
      <View style={{ alignSelf: "flex-start", width: size * 0.4, height: size * 0.18, backgroundColor: color, borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
      <View style={{ width: size, height: size * 0.62, borderWidth: stroke, borderColor: color, borderRadius: 2 }} />
    </View>
  );
}
