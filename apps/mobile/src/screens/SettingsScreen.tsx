import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from "react-native";
import type { PublicUser } from "@z-notes/shared";
import { getBaseUrl, setBaseUrl, getToken, normalizeBaseUrl, isDevBuild, DEFAULT_BASE_URL, PROD_BASE_URL } from "../api/http";
import { clearUserCache } from "../lib/storage";

interface SettingsScreenProps {
  user?: PublicUser | null;
  userId?: number | null;
  onClearMemoryCache?: () => void;
  onBack: () => void;
  onLogout: () => void | Promise<void>;
}

export default function SettingsScreen({
  user,
  userId,
  onClearMemoryCache,
  onBack,
  onLogout,
}: SettingsScreenProps) {
  const [url, setUrl] = useState(getBaseUrl());
  const [savedMessage, setSavedMessage] = useState(false);

  const handleSaveUrl = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      Alert.alert("Erro", "A URL do servidor não pode ser vazia.");
      return;
    }
    const normalized = normalizeBaseUrl(trimmed);
    if (!normalized) {
      Alert.alert("Erro", "A URL do servidor precisa começar com https://");
      return;
    }
    // Trocar de servidor com a sessão aberta enviaria o JWT ao host novo:
    // encerra a sessão (token, usuário e cache) antes de gravar a URL e volta ao login.
    if (normalized !== getBaseUrl() && getToken()) {
      await onLogout();
    }
    setBaseUrl(normalized);
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
  };

  const handleClearCache = async () => {
    Alert.alert(
      "Limpar cache local",
      "Isso removerá todas as notas e pastas salvas offline no aparelho. Deseja continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Limpar",
          style: "destructive",
          onPress: async () => {
            onClearMemoryCache?.();
            await clearUserCache(user?.id ?? userId ?? undefined);
            Alert.alert("Sucesso", "Cache local limpo.");
          },
        },
      ],
    );
  };

  const handleLogout = () => {
    Alert.alert("Sair da conta", "Tem certeza que deseja sair?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        // A limpeza de token e cache é feita uma vez só, no onLogout do App.
        onPress: () => {
          onLogout();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backBtn}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configurações</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Servidor</Text>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          placeholder={isDevBuild() ? DEFAULT_BASE_URL : PROD_BASE_URL}
          placeholderTextColor="#b0bec5"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.btn} onPress={handleSaveUrl}>
          <Text style={styles.btnText}>
            {savedMessage ? "✓ URL Salva!" : "Salvar URL"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Armazenamento Offline</Text>
        <TouchableOpacity style={[styles.btn, styles.secondaryBtn]} onPress={handleClearCache}>
          <Text style={styles.secondaryBtnText}>Limpar cache local</Text>
        </TouchableOpacity>
      </View>

      {user && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Conta</Text>
          <Text style={styles.infoText}>{user.name || user.email}</Text>
          <Text style={styles.subInfoText}>{user.email}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sobre</Text>
        <Text style={styles.infoText}>z-notes mobile v0.1.0</Text>
        <Text style={styles.subInfoText}>Compatível com Fastify + SQLite</Text>
      </View>

      <View style={[styles.section, styles.logoutSection]}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1c1c1e", padding: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#414144",
    marginBottom: 20,
  },
  backBtn: { color: "#ffc107", fontSize: 16, marginRight: 16, fontWeight: "600" },
  headerTitle: { color: "#eceff1", fontSize: 20, fontWeight: "700" },
  section: {
    marginBottom: 24,
    backgroundColor: "#28282a",
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    color: "#b0bec5",
    fontSize: 12,
    textTransform: "uppercase",
    fontWeight: "600",
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#1c1c1e",
    color: "#eceff1",
    padding: 12,
    borderRadius: 8,
    fontSize: 15,
    marginBottom: 12,
  },
  btn: {
    backgroundColor: "#ffc107",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  btnText: { color: "#263238", fontSize: 15, fontWeight: "600" },
  secondaryBtn: { backgroundColor: "#303032" },
  secondaryBtnText: { color: "#eceff1", fontSize: 15, fontWeight: "500" },
  infoText: { color: "#eceff1", fontSize: 15, fontWeight: "600", marginBottom: 2 },
  subInfoText: { color: "#b0bec5", fontSize: 13 },
  logoutSection: { marginTop: "auto", backgroundColor: "transparent", padding: 0 },
  logoutBtn: {
    backgroundColor: "#1c1c1e",
    borderWidth: 1,
    borderColor: "#ff453a",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  logoutText: { color: "#ff453a", fontSize: 16, fontWeight: "600" },
});
