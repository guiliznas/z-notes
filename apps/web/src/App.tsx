import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { LoginPage } from "@/components/LoginPage";
import { NotesPage } from "@/components/NotesPage";

export function App() {
  const { status } = useAuth();

  if (status === "loading") {
    return <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">Carregando…</div>;
  }
  if (status === "unauthenticated") {
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route path="/" element={<NotesPage />} />
      <Route path="/all" element={<NotesPage />} />
      <Route path="/all/note/:noteId" element={<NotesPage />} />
      <Route path="/archived" element={<NotesPage />} />
      <Route path="/archived/note/:noteId" element={<NotesPage />} />
      <Route path="/trash" element={<NotesPage />} />
      <Route path="/trash/note/:noteId" element={<NotesPage />} />
      <Route path="/folder/:folderId" element={<NotesPage />} />
      <Route path="/folder/:folderId/note/:noteId" element={<NotesPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
