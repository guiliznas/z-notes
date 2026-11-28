import { useState } from "react";
import { useApiTokens } from "@/hooks/useApiTokens";
import { type ApiTokenItem, type CreatedApiToken } from "@/api/resources";
import { Button } from "./ui/Button";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import { useToast } from "./ui/Toast";
import { relativeTime } from "@/lib/time";
import { getBaseUrl } from "@/api/http";

export function PersonalTokensSection() {
  const { tokens, isLoading, isCreating, isRevoking, createToken, revokeToken } = useApiTokens();
  const { notify } = useToast();

  const [creatingFormOpen, setCreatingFormOpen] = useState(false);
  const [tokenName, setTokenName] = useState("");
  const [justCreated, setJustCreated] = useState<CreatedApiToken | null>(null);
  const [tokenToRevoke, setTokenToRevoke] = useState<ApiTokenItem | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDocs, setShowDocs] = useState(false);

  const handleCreate = async () => {
    const trimmed = tokenName.trim();
    if (!trimmed) {
      notify("Digite um nome para o token.", "error");
      return;
    }
    try {
      const created = await createToken(trimmed);
      setJustCreated(created);
      setTokenName("");
      setCreatingFormOpen(false);
      notify("Token pessoal criado com sucesso!", "success");
    } catch {
      notify("Falha ao gerar token pessoal.", "error");
    }
  };

  const handleCopy = async () => {
    if (!justCreated) return;
    try {
      await navigator.clipboard.writeText(justCreated.token);
      setCopied(true);
      notify("Token copiado para a área de transferência!", "success");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      notify("Não foi possível copiar automaticamente.", "error");
    }
  };

  const handleConfirmRevoke = async () => {
    if (!tokenToRevoke) return;
    try {
      await revokeToken(tokenToRevoke.id);
      notify(`Token "${tokenToRevoke.name}" revogado com sucesso.`, "success");
      setTokenToRevoke(null);
    } catch {
      notify("Falha ao revogar token.", "error");
    }
  };

  const baseEndpoint = getBaseUrl() ? `${getBaseUrl()}/api/inbox` : `${window.location.origin}/api/inbox`;

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-medium text-[var(--text)]">Tokens Pessoais de Captura</h3>
          <p className="text-xs text-[var(--muted)]">
            Tokens com permissão exclusiva de escrita no Inbox (<code className="rounded bg-[var(--surface-2)] px-1 py-0.5 font-mono text-[11px]">inbox:write</code>).
            Use em Atalhos do iOS, Tasker no Android, bots ou linha de comando.
          </p>
        </div>
        {!creatingFormOpen && !justCreated && (
          <Button
            variant="primary"
            onClick={() => setCreatingFormOpen(true)}
            className="shrink-0 text-xs"
          >
            + Novo Token
          </Button>
        )}
      </div>

      {/* Alerta de Token Recém-Criado */}
      {justCreated && (
        <div className="flex flex-col gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 dark:bg-amber-500/15">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-amber-700 dark:text-amber-400">
              Token &quot;{justCreated.name}&quot; gerado com sucesso!
            </span>
            <button
              type="button"
              onClick={() => setJustCreated(null)}
              className="text-xs text-[var(--muted)] hover:text-[var(--text)]"
            >
              Fechar aviso
            </button>
          </div>
          <p className="text-xs text-[var(--text)]">
            <strong>Atenção:</strong> Copie seu token agora. Por razões de segurança, este token é armazenado no servidor apenas como hash SHA-256 e <strong>nunca mais será exibido</strong>.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={justCreated.token}
              onFocus={(e) => e.target.select()}
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 font-mono text-xs text-[var(--text)] selection:bg-amber-300"
            />
            <Button variant="primary" onClick={handleCopy} className="shrink-0 text-xs">
              {copied ? "✓ Copiado!" : "Copiar Token"}
            </Button>
          </div>
        </div>
      )}

      {/* Formulário de Criação */}
      {creatingFormOpen && (
        <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <label className="text-xs font-medium text-[var(--text)]">Nome do Token ou Integração</label>
          <input
            type="text"
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)}
            placeholder="Ex.: Atalhos do iPhone, Tasker Android, Bot Telegram..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") setCreatingFormOpen(false);
            }}
          />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setCreatingFormOpen(false)} className="text-xs">
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={isCreating} className="text-xs">
              {isCreating ? "Gerando…" : "Gerar Token"}
            </Button>
          </div>
        </div>
      )}

      {/* Lista de Tokens */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">
          Tokens Existentes ({tokens.length})
        </span>

        {isLoading ? (
          <p className="py-2 text-xs text-[var(--muted)]">Carregando tokens…</p>
        ) : tokens.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--border)] p-4 text-center text-xs text-[var(--muted)]">
            Nenhum token criado ainda. Crie um token para capturar notas a partir de outros dispositivos ou apps.
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            {tokens.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 p-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--text)] truncate">{t.name}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        t.active
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : "bg-red-500/15 text-red-600 dark:text-red-400"
                      }`}
                    >
                      {t.active ? "Ativo" : "Revogado"}
                    </span>
                    <span className="rounded bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted)]">
                      {t.scope}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-[var(--muted)]">
                    <span className="font-mono text-[10px] text-[var(--text)]">{t.prefix}</span>
                    <span>Criado: {new Date(t.createdAt).toLocaleDateString()}</span>
                    <span>
                      Último uso: {t.lastUsedAt ? relativeTime(t.lastUsedAt) : "Nunca utilizado"}
                    </span>
                  </div>
                </div>

                {t.active ? (
                  <Button
                    variant="danger"
                    onClick={() => setTokenToRevoke(t)}
                    disabled={isRevoking}
                    className="shrink-0 text-xs"
                  >
                    Revogar
                  </Button>
                ) : (
                  <span className="shrink-0 text-xs text-[var(--muted)]">Revogado</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seção Explicativa / Como usar */}
      <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-3">
        <button
          type="button"
          onClick={() => setShowDocs(!showDocs)}
          className="flex items-center justify-between text-xs font-medium text-[var(--text)] hover:text-[var(--accent)]"
        >
          <span>{showDocs ? "▼" : "▶"} Como configurar no iOS Atalhos, Tasker e cURL</span>
          <span className="text-[11px] text-[var(--muted)]">{showDocs ? "Ocultar" : "Ver exemplos"}</span>
        </button>

        {showDocs && (
          <div className="flex flex-col gap-3 rounded-xl bg-[var(--surface-2)] p-3 text-xs text-[var(--text)]">
            <div className="flex flex-col gap-1">
              <span className="font-semibold">Endpoint de Captura:</span>
              <code className="rounded bg-[var(--surface)] px-2 py-1 font-mono text-[11px] select-all">
                POST {baseEndpoint}
              </code>
            </div>

            <div className="flex flex-col gap-1">
              <span className="font-semibold">Cabeçalho de Autenticação:</span>
              <code className="rounded bg-[var(--surface)] px-2 py-1 font-mono text-[11px] select-all">
                Authorization: Bearer znt_...
              </code>
            </div>

            <div className="flex flex-col gap-1">
              <span className="font-semibold">Exemplo com cURL (Terminal):</span>
              <pre className="overflow-x-auto rounded bg-[var(--surface)] p-2 font-mono text-[11px] leading-tight select-all">
{`curl -X POST ${baseEndpoint} \\
  -H "Authorization: Bearer znt_SEU_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"content": "Minha anotação rápida"}'`}
              </pre>
            </div>

            <div className="flex flex-col gap-1">
              <span className="font-semibold">No Atalhos do iOS (Siri Shortcuts):</span>
              <ol className="list-decimal pl-4 space-y-1 text-[11px] text-[var(--muted)]">
                <li>Adicione a ação <strong>&quot;Obter Conteúdo do URL&quot;</strong> apontando para a URL acima.</li>
                <li>Defina o Método como <strong>POST</strong>.</li>
                <li>Em Cabeçalhos, adicione <strong>Authorization</strong> com o valor <code className="font-mono">Bearer znt_SEU_TOKEN</code>.</li>
                <li>No Corpo da Requisição, selecione <strong>JSON</strong> e adicione o campo <code className="font-mono">content</code> vinculado à entrada do atalho (ou texto compartilhado).</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* Diálogo de Confirmação para Revogar */}
      {tokenToRevoke && (
        <ConfirmDialog
          title="Revogar Token de Captura"
          message={`Tem certeza que deseja revogar o token "${tokenToRevoke.name}"? As automações ou atalhos que utilizam este token deixarão de funcionar imediatamente.`}
          confirmLabel="Revogar Token"
          danger
          onConfirm={handleConfirmRevoke}
          onClose={() => setTokenToRevoke(null)}
        />
      )}
    </div>
  );
}
