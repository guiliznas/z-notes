import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { PerUserProvider } from "@/offline/PerUserProvider";
import { LoginPage } from "@/components/LoginPage";
import { NotesPage } from "@/components/NotesPage";
import { AdminPage } from "@/components/AdminPage";
import { UpdatePrompt } from "@/components/UpdatePrompt";

export function App() {
  const { status, user } = useAuth();

  if (status === "loading") {
    return <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">Carregando…</div>;
  }
  if (status === "unauthenticated" || !user) {
    return (
      <>
        <LoginPage />
        <UpdatePrompt />
      </>
    );
  }

  // A exibição da rota é UX: a autorização real é feita pelo backend em cada /api/admin/*.
  const adminRoutes = user.isAdmin ? <Route path="/admin" element={<AdminPage />} /> : null;

  return (
    <PerUserProvider key={user.id} userId={user.id}>
      <Routes>
        <Route path="/" element={<NotesPage />} />
        {adminRoutes}
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
      <UpdatePrompt />
    </PerUserProvider>
  );
}
