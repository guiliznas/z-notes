import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { PerUserProvider } from "@/offline/PerUserProvider";
import { LoginPage } from "@/components/LoginPage";
import { NotesPage } from "@/components/NotesPage";
import { TasksPage } from "@/components/tasks/TasksPage";
import { InboxPage } from "@/components/inbox/InboxPage";
import { AdminPage } from "@/components/AdminPage";
import { UpdatePrompt } from "@/components/UpdatePrompt";
import {
  extractSharePayload,
  normalizeSharePayload,
  hasShareParams,
  savePendingShare,
  getPendingShare,
} from "@/lib/shareTarget";
import { getPendingCapture } from "@/lib/deepLink";

export function App() {
  const { status, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Se o usuário estiver deslogado e receber compartilhamento via Web Share Target
  // (seja na rota /inbox/share ou com parâmetros de compartilhamento), preserva o conteúdo
  // no localStorage dentro de um efeito para não disparar efeitos colaterais durante o render.
  const incomingShare =
    status === "unauthenticated" &&
    (location.pathname === "/inbox/share" || hasShareParams(location.search))
      ? normalizeSharePayload(extractSharePayload(location.search))
      : null;

  useEffect(() => {
    if (incomingShare) {
      savePendingShare(incomingShare);
    }
  }, [incomingShare]);

  // Quando o usuário estiver autenticado (ex.: após voltar do Google OAuth em "/"),
  // se houver compartilhamento ou captura rápida desktop pendente no localStorage, redireciona para o Inbox.
  useEffect(() => {
    if (status === "authenticated" && user) {
      const pendingShare = getPendingShare();
      const pendingCapture = getPendingCapture();
      if ((pendingShare || pendingCapture) && location.pathname === "/") {
        navigate("/inbox", { replace: true });
      }
    }
  }, [status, user, location.pathname, navigate]);

  if (status === "loading") {
    return <div className="flex h-full items-center justify-center text-sm text-[var(--muted)]">Carregando…</div>;
  }
  if (status === "unauthenticated" || !user) {
    return (
      <>
        <LoginPage incomingShare={incomingShare} />
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
        <Route path="/pinned" element={<NotesPage />} />
        <Route path="/pinned/note/:noteId" element={<NotesPage />} />
        <Route path="/archived" element={<NotesPage />} />
        <Route path="/archived/note/:noteId" element={<NotesPage />} />
        <Route path="/trash" element={<NotesPage />} />
        <Route path="/trash/note/:noteId" element={<NotesPage />} />
        <Route path="/folder/:folderId" element={<NotesPage />} />
        <Route path="/folder/:folderId/note/:noteId" element={<NotesPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/tasks/folder/:folderId" element={<TasksPage />} />
        <Route path="/tasks/archived" element={<TasksPage />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/inbox/share" element={<InboxPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <UpdatePrompt />
    </PerUserProvider>
  );
}
