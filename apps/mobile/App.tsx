import { useState, useEffect, useMemo } from "react";
import { Alert, BackHandler } from "react-native";
import { StatusBar } from "expo-status-bar";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import type { NoteViewFilter, PublicUser } from "@z-notes/shared";
import { createQueryClient } from "./src/lib/queryClient";
import { persistOptionsFor, clearUserCache } from "./src/lib/storage";
import { clearToken } from "./src/api/http";
import { bootSession } from "./src/lib/bootSession";
import { createNoteForFolder } from "./src/lib/createNoteFlow";
import LoginScreen from "./src/screens/LoginScreen";
import NoteListScreen from "./src/screens/NoteListScreen";
import NoteDetailScreen from "./src/screens/NoteDetailScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import FolderDrawer from "./src/components/FolderDrawer";

type Screen = "login" | "list" | "detail" | "settings";

interface SelectedFolderState {
  folderId: number | null;
  folderName?: string;
  view: NoteViewFilter;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [user, setUser] = useState<PublicUser | null>(null);
  const [sessionUserId, setSessionUserId] = useState<number | null>(null);
  const cacheUserId = user?.id ?? sessionUserId;
  const [selectedNote, setSelectedNote] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [folderState, setFolderState] = useState<SelectedFolderState>({
    folderId: null,
    folderName: undefined,
    view: "active",
  });

  const { client, clientPersistOptions } = useMemo(() => {
    const qClient = createQueryClient();
    const pOpts = persistOptionsFor(cacheUserId);
    return { client: qClient, clientPersistOptions: pOpts };
  }, [cacheUserId]);

  useEffect(() => {
    bootSession().then((res) => {
      setUser(res.user);
      setSessionUserId(res.userId);
      setScreen(res.screen);
    });
  }, []);

  // Botão voltar do Android: detalhe/configurações → lista; drawer aberto → fecha; lista → sai do app.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (drawerOpen) {
        setDrawerOpen(false);
        return true;
      }
      if (screen === "detail" || screen === "settings") {
        setScreen("list");
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [screen, drawerOpen]);

  const handleAuthenticated = (authUser?: PublicUser) => {
    if (authUser) setUser(authUser);
    setScreen("list");
  };

  // Cache em memória e local do usuário anterior não podem vazar para a próxima sessão.
  const handleLogout = async () => {
    client.clear();
    if (cacheUserId !== null) await clearUserCache(cacheUserId);
    await clearToken();
    setUser(null);
    setSessionUserId(null);
    setScreen("login");
  };

  const handleSelectNote = (id: number) => {
    setSelectedNote(id);
    setScreen("detail");
  };

  const handleCreateNote = async () => {
    try {
      const note = await createNoteForFolder(client, folderState.folderId);
      setSelectedNote(note.id);
      setScreen("detail");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Não foi possível criar a nota.";
      Alert.alert("Erro", msg);
    }
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
      key={cacheUserId ?? "anonymous"}
      client={client}
      persistOptions={clientPersistOptions}
      onSuccess={() => client.resumePausedMutations()}
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
          user={user}
          userId={cacheUserId}
          onClearMemoryCache={() => client.clear()}
          onBack={() => setScreen("list")}
          onLogout={handleLogout}
        />
      )}
    </PersistQueryClientProvider>
  );
}
