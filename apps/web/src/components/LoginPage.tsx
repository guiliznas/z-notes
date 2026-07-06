import { useState, type FormEvent } from "react";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "./ui/Button";
import { NoteIcon } from "./icons";

export function LoginPage() {
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(password);
    } catch {
      setError("Senha incorreta.");
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full items-center justify-center bg-[var(--bg)] p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-xl"
      >
        <div className="mb-6 flex items-center gap-2 text-[var(--accent)]">
          <NoteIcon className="text-2xl" />
          <span className="text-xl font-semibold text-[var(--text)]">z-notes</span>
        </div>
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
