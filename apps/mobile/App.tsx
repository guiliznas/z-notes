import { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import type { NoteViewFilter } from "@z-notes/shared";
import { createQueryClient } from "./src/lib/queryClient";
import { persistOptions } from "./src/lib/storage";
import { loadToken, loadBaseUrl } from "./src/api/http";
import LoginScreen from "./src/screens/LoginScreen";
import NoteListScreen from "./src/screens/NoteListScreen";
import NoteDetailScreen from "./src/screens/NoteDetailScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import FolderDrawer from "./src/components/FolderDrawer";

const queryClient = createQueryClient();

type Screen = "login" | "list" | "detail" | "settings";

interface SelectedFolderState {
  folderId: number | null;
  folderName?: string;
  view: NoteViewFilter;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [selectedNote, setSelectedNote] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [folderState, setFolderState] = useState<SelectedFolderState>({
    folderId: null,
    folderName: undefined,
    view: "active",
  });

  useEffect(() => {
    Promise.all([loadToken(), loadBaseUrl()]).then(([t]) => {
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
    // Se estiver em uma pasta específica, cria nela. Senão, pasta raiz padrão 1.
    const targetFolderId = folderState.folderId ?? 1;
    const note = await createNote({ folderId: targetFolderId });
    setSelectedNote(note.id);
    setScreen("detail");
  };

  const handleSelectView = (view: NoteViewFilter) => {
    setFolderState({
      folderId: null,
      folderName: undefined,
      view,
    });
  };

  const handleSelectFolder = (folderId: number, folderName: string) => {
    setFolderState({
      folderId,
      folderName,
      view: "active",
    });
  };

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
      onSuccess={() => queryClient.resumePausedMutations()}
    >
      <StatusBar style="light" />
      {screen === "login" && <LoginScreen onAuthenticated={handleAuthenticated} />}
      {screen === "list" && (
        <>
          <NoteListScreen
            folderId={folderState.folderId}
            folderName={folderState.folderName}
            view={folderState.view}
            onOpenDrawer={() => setDrawerOpen(true)}
            onSelectNote={handleSelectNote}
            onCreateNote={handleCreateNote}
          />
          <FolderDrawer
            visible={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            selectedFolderId={folderState.folderId}
            selectedView={folderState.view}
            onSelectView={handleSelectView}
            onSelectFolder={handleSelectFolder}
            onOpenSettings={() => {
              setDrawerOpen(false);
              setScreen("settings");
            }}
          />
        </>
      )}
      {screen === "detail" && selectedNote !== null && (
        <NoteDetailScreen noteId={selectedNote} onBack={() => setScreen("list")} />
      )}
      {screen === "settings" && (
        <SettingsScreen
          onBack={() => setScreen("list")}
          onLogout={() => setScreen("login")}
        />
      )}
    </PersistQueryClientProvider>
  );
}
