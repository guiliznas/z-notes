import { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "./src/lib/queryClient";
import { loadToken, setBaseUrl } from "./src/api/http";
import LoginScreen from "./src/screens/LoginScreen";
import NoteListScreen from "./src/screens/NoteListScreen";
import NoteDetailScreen from "./src/screens/NoteDetailScreen";

const Stack = createNativeStackNavigator();
const queryClient = createQueryClient();

type Screen = "login" | "list" | "detail";

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [selectedNote, setSelectedNote] = useState<number | null>(null);

  useEffect(() => {
    loadToken().then((t) => {
      if (t) setScreen("list");
    });
  }, []);

  const handleAuthenticated = () => setScreen("list");

  const handleSelectNote = (id: number) => {
    setSelectedNote(id);
    setScreen("detail");
  };

  const handleCreateNote = async () => {
    const { createNote } = await import("./src/api/resources");
    const note = await createNote({ folderId: 1 });
    setSelectedNote(note.id);
    setScreen("detail");
  };

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      {screen === "login" && <LoginScreen onAuthenticated={handleAuthenticated} />}
      {screen === "list" && (
        <NoteListScreen
          folderId={null}
          onSelectNote={handleSelectNote}
          onCreateNote={handleCreateNote}
        />
      )}
      {screen === "detail" && selectedNote !== null && (
        <NoteDetailScreen noteId={selectedNote} onBack={() => setScreen("list")} />
      )}
    </QueryClientProvider>
  );
}