import { useState, type FormEvent } from "react";
import { useAuth } from "@/auth/AuthContext";
import { getBaseUrl, setBaseUrl, isTauriEnvironment } from "@/api/http";
import { Button } from "./ui/Button";
import { NoteIcon, SettingsIcon } from "./icons";

export function LoginPage() {
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showServerConfig, setShowServerConfig] = useState(isTauriEnvironment() && !getBaseUrl());
  const [serverUrl, setServerUrl] = useState(getBaseUrl());
  const [savedMessage, setSavedMessage] = useState(false);

  const handleSaveServerUrl = () => {
    setBaseUrl(serverUrl.trim());
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      setBaseUrl(serverUrl.trim());
      await login(password);
    } catch {
      setError("Senha incorreta ou falha na conexão.");
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center bg-[var(--bg)] p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-xl"
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[var(--accent)]">
            <NoteIcon className="text-2xl" />
            <span className="text-xl font-semibold text-[var(--text)]">z-notes</span>
          </div>
          <button
            type="button"
            onClick={() => setShowServerConfig(!showServerConfig)}
            className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--text)]"
            title="Configurar servidor"
          >
            <SettingsIcon className="text-base" />
          </button>
        </div>

        {showServerConfig && (
          <div className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs">
            <label className="mb-1 block font-medium text-[var(--text)]">URL do Servidor</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="http://localhost:8787"
                className="flex-1 rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
              <Button type="button" variant="subtle" onClick={handleSaveServerUrl} className="px-2 py-1 text-xs">
                {savedMessage ? "Salvo!" : "Salvar"}
              </Button>
            </div>
          </div>
        )}

        <label className="mb-2 block text-sm text-[var(--muted)]">Senha de acesso</label>
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-3 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 text-sm outline-none focus:border-[var(--accent)]"
        />
        {error && <p className="mb-3 text-sm text-[var(--danger)]">{error}</p>}
        <Button type="submit" variant="primary" disabled={loading || !password} className="w-full">
          {loading ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </div>
  );
}

