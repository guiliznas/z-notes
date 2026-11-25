import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { authMe } from "../api/resources";
import { saveToken, setBaseUrl, getBaseUrl, loadBaseUrl } from "../api/http";
import { AUTH_REDIRECT, googleLoginUrl, parseAuthRedirect } from "../api/auth";

interface Props {
  onAuthenticated: () => void;
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
      setBaseUrl(serverUrl);
      const session = await WebBrowser.openAuthSessionAsync(googleLoginUrl(serverUrl), AUTH_REDIRECT);
      if (session.type !== "success") return;
      const result = parseAuthRedirect(session.url);
      if (!result) throw new Error("Resposta de login inválida");
      if ("error" in result) {
        throw new Error(result.error === "denied" ? "Login cancelado no Google" : "Falha no login com Google");
      }
      await saveToken(result.token);
      const me = await authMe();
      if (me.authenticated) onAuthenticated();
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
        placeholderTextColor="#888"
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
  title: { fontSize: 28, fontWeight: "700", color: "#fff", textAlign: "center", marginBottom: 32 },
  input: {
    backgroundColor: "#2c2c2e", color: "#fff", padding: 14, borderRadius: 10,
    fontSize: 16, marginBottom: 12,
  },
  button: { backgroundColor: "#007AFF", padding: 14, borderRadius: 10, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
