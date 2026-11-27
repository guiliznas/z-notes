import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import type { PublicUser } from "@z-notes/shared";
import { authMe, authPassword } from "../api/resources";
import { ApiError, saveToken, setBaseUrl, getBaseUrl, loadBaseUrl, saveCurrentUser } from "../api/http";
import { AUTH_REDIRECT, googleLoginUrl, parseAuthRedirect } from "../api/auth";

interface Props {
  onAuthenticated: (user?: PublicUser) => void;
}

function errorMessage(e: unknown): string {
  // Sem alcançar o servidor, o fetch do React Native rejeita com TypeError ("Network request failed");
  // o do Expo, usado no aparelho, com um Error cuja mensagem começa por "fetch failed:".
  if (e instanceof TypeError || (e instanceof Error && e.message.startsWith("fetch failed:"))) {
    return "Não foi possível conectar ao servidor";
  }
  return e instanceof Error ? e.message : "Erro ao conectar";
}

function passwordErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 401) return "Usuário ou senha inválidos";
    if (e.status === 404) return "Este servidor não aceita login com usuário e senha";
    if (e.status === 429) return "Muitas tentativas. Aguarde um minuto e tente de novo";
  }
  return errorMessage(e);
}

export default function LoginScreen({ onAuthenticated }: Props) {
  const [loading, setLoading] = useState<"google" | "password" | null>(null);
  const [serverUrl, setServerUrl] = useState(getBaseUrl());
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const passwordRef = useRef<TextInput>(null);

  useEffect(() => {
    loadBaseUrl().then((u) => setServerUrl(u));
  }, []);

  const handleLogin = async () => {
    if (loading) return;
    setLoading("google");
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
      Alert.alert("Erro", errorMessage(e));
    } finally {
      setLoading(null);
    }
  };

  const handlePasswordLogin = async () => {
    if (loading) return;
    if (!username.trim() || !password) {
      Alert.alert("Erro", "Informe usuário e senha");
      return;
    }
    setLoading("password");
    try {
      setBaseUrl(serverUrl.trim());
      const { token, user } = await authPassword(username.trim(), password);
      await saveToken(token);
      await saveCurrentUser(user);
      onAuthenticated(user);
    } catch (e: unknown) {
      Alert.alert("Erro", passwordErrorMessage(e));
    } finally {
      setLoading(null);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior="padding">
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>z-notes</Text>
        <TextInput
          style={styles.input}
          placeholder="URL do servidor"
          accessibilityLabel="URL do servidor"
          placeholderTextColor="#b0bec5"
          value={serverUrl}
          onChangeText={setServerUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.button, loading === "password" && styles.dimmed]}
          onPress={handleLogin}
          disabled={loading !== null}
        >
          <Text style={styles.buttonText}>{loading === "google" ? "Entrando..." : "Entrar com Google"}</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.dividerLine} />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Usuário"
          accessibilityLabel="Usuário"
          placeholderTextColor="#b0bec5"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <TextInput
          ref={passwordRef}
          style={styles.input}
          placeholder="Senha"
          accessibilityLabel="Senha"
          placeholderTextColor="#b0bec5"
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="current-password"
          secureTextEntry
          returnKeyType="go"
          onSubmitEditing={handlePasswordLogin}
        />
        <TouchableOpacity
          style={[styles.secondaryButton, loading === "google" && styles.dimmed]}
          onPress={handlePasswordLogin}
          disabled={loading !== null}
        >
          <Text style={styles.secondaryButtonText}>{loading === "password" ? "Entrando..." : "Entrar"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#1c1c1e" },
  container: { flexGrow: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 28, fontWeight: "700", color: "#eceff1", textAlign: "center", marginBottom: 32 },
  input: {
    backgroundColor: "#28282a", color: "#eceff1", padding: 14, borderRadius: 10,
    borderWidth: 1, borderColor: "#414144", fontSize: 16, marginBottom: 12,
  },
  button: { backgroundColor: "#ffc107", padding: 14, borderRadius: 10, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#263238", fontSize: 16, fontWeight: "600" },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#414144" },
  dividerText: { color: "#b0bec5", fontSize: 14, marginHorizontal: 12 },
  secondaryButton: {
    // 13 + 1 de borda: mesma altura do botão do Google.
    paddingVertical: 13, paddingHorizontal: 14, borderRadius: 10, alignItems: "center",
    borderWidth: 1, borderColor: "#ffc107", marginTop: 8,
  },
  secondaryButtonText: { color: "#ffc107", fontSize: 16, fontWeight: "600" },
  dimmed: { opacity: 0.6 },
});
