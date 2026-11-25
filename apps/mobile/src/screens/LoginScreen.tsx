import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from "react-native";
import * as WebBrowser from "expo-web-browser";
import type { PublicUser } from "@z-notes/shared";
import { authMe } from "../api/resources";
import { saveToken, setBaseUrl, getBaseUrl, loadBaseUrl, saveCurrentUser } from "../api/http";
import { AUTH_REDIRECT, googleLoginUrl, parseAuthRedirect } from "../api/auth";

interface Props {
  onAuthenticated: (user?: PublicUser) => void;
}

export default function LoginScreen({ onAuthenticated }: Props) {
  const [loading, setLoading] = useState(false);
  const [serverUrl, setServerUrl] = useState(getBaseUrl());

  useEffect(() => {
    loadBaseUrl().then((u) => setServerUrl(u));
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    try {
      setBaseUrl(serverUrl.trim());
      const session = await WebBrowser.openAuthSessionAsync(googleLoginUrl(getBaseUrl()), AUTH_REDIRECT);
      if (session.type !== "success") return;
      const result = parseAuthRedirect(session.url);
      if (!result) throw new Error("Resposta de login inválida");
      if ("error" in result) {
        throw new Error(result.error === "denied" ? "Login cancelado no Google" : "Falha no login com Google");
      }
      await saveToken(result.token);
      const me = await authMe();
      if (me.authenticated) {
        await saveCurrentUser(me.user);
        onAuthenticated(me.user);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erro ao conectar";
      Alert.alert("Erro", msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>z-notes</Text>
      <TextInput
        style={styles.input}
        placeholder="URL do servidor"
        placeholderTextColor="#b0bec5"
        value={serverUrl}
        onChangeText={setServerUrl}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Entrando..." : "Entrar com Google"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#1c1c1e" },
  title: { fontSize: 28, fontWeight: "700", color: "#eceff1", textAlign: "center", marginBottom: 32 },
  input: {
    backgroundColor: "#28282a", color: "#eceff1", padding: 14, borderRadius: 10,
    borderWidth: 1, borderColor: "#414144", fontSize: 16, marginBottom: 12,
  },
  button: { backgroundColor: "#ffc107", padding: 14, borderRadius: 10, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#263238", fontSize: 16, fontWeight: "600" },
});
