import { useSearchParams } from "react-router-dom";
import { googleLoginUrl } from "@/api/resources";
import { Button } from "./ui/Button";
import { NoteIcon } from "./icons";

const AUTH_ERRORS: Record<string, string> = {
  denied: "Login com Google foi cancelado.",
  error: "Falha no login com Google. Tente novamente.",
};

export function LoginPage() {
  const [params] = useSearchParams();
  const error = AUTH_ERRORS[params.get("auth") ?? ""] ?? "";

  return (
    <div className="flex h-full items-center justify-center bg-[var(--bg)] p-4">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-xl">
        <div className="mb-6 flex items-center gap-2 text-[var(--accent)]">
          <NoteIcon className="text-2xl" />
          <span className="text-xl font-semibold text-[var(--text)]">z-notes</span>
        </div>
        <p className="mb-5 text-sm text-[var(--muted)]">Suas notas, só suas. Entre com sua conta Google.</p>
        {error && <p className="mb-3 text-sm text-[var(--danger)]">{error}</p>}
        <Button
          variant="primary"
          className="w-full"
          onClick={() => {
            window.location.href = googleLoginUrl;
          }}
        >
          Entrar com Google
        </Button>
      </div>
    </div>
  );
}
