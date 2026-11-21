import { View } from "react-native";

export type IconName = "pin" | "archive" | "folder";

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
}

// Ícones desenhados com Views (sem dependência extra nem emoji).
export default function Icon({ name, size = 16, color = "#8e8e93" }: IconProps) {
  const stroke = Math.max(1.5, size / 10);
  const box = { width: size, height: size, alignItems: "center" as const, justifyContent: "center" as const };

  if (name === "pin") {
    // cabeça redonda + haste
    return (
      <View accessibilityLabel="Fixada" style={box}>
        <View style={{ width: size * 0.55, height: size * 0.55, borderRadius: size, backgroundColor: color }} />
        <View style={{ width: stroke, height: size * 0.4, backgroundColor: color }} />
      </View>
    );
  }
  if (name === "archive") {
    // tampa + caixa
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
  // folder
  return (
    <View accessibilityLabel="Pasta" style={box}>
      <View style={{ alignSelf: "flex-start", width: size * 0.4, height: size * 0.18, backgroundColor: color, borderTopLeftRadius: 2, borderTopRightRadius: 2 }} />
      <View style={{ width: size, height: size * 0.62, borderWidth: stroke, borderColor: color, borderRadius: 2 }} />
    </View>
  );
}
