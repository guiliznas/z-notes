import { useState } from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { getBaseUrl, setBaseUrl, resetBaseUrl, isTauriEnvironment } from "@/api/http";
import { useToast } from "./ui/Toast";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: Props) {
  const [url, setUrl] = useState(getBaseUrl());
  const { notify } = useToast();
  const qc = useQueryClient();
  const isDesktop = isTauriEnvironment();

  if (!open) return null;

  const handleSave = () => {
    const trimmed = url.trim();
    setBaseUrl(trimmed);
    qc.invalidateQueries();
    notify("Configurações salvas.", "success");
    onClose();
  };

  const handleReset = () => {
    resetBaseUrl();
    const defaultUrl = getBaseUrl();
    setUrl(defaultUrl);
    qc.invalidateQueries();
    notify("Configuração restaurada ao padrão.", "info");
  };

  const handleClearCache = async () => {
    try {
      await qc.cancelQueries();
      qc.clear();
      // Limpar IndexedDB se existir
      if (typeof indexedDB !== "undefined") {
        indexedDB.deleteDatabase("z-notes-db");
      }
      notify("Cache offline limpo com sucesso.", "success");
    } catch {
      notify("Falha ao limpar cache.", "error");
    }
  };

  return (
    <Modal title="Configurações" onClose={onClose}>
      <div className="flex flex-col gap-5 text-sm">
        {/* Servidor */}
        <div className="flex flex-col gap-2">
          <label className="font-medium text-[var(--text)]">URL do Servidor (API)</label>
          <p className="text-xs text-[var(--muted)]">
            {isDesktop
              ? "Endereço do backend Fastify. No desktop, você pode apontar para localhost ou servidor remoto."
              : "URL base para chamadas de API. Em branco usará a rota relativa padrão (/api)."}
          </p>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={isDesktop ? "http://localhost:8787" : "https://meu-servidor.com ou deixe vazio"}
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
          />
          <div className="flex gap-2 pt-1">
            <Button variant="primary" onClick={handleSave} className="text-xs">
              Salvar
            </Button>
            <Button variant="ghost" onClick={handleReset} className="text-xs">
              Restaurar Padrão
            </Button>
          </div>
        </div>

        {/* Cache Offline */}
        <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-4">
          <label className="font-medium text-[var(--text)]">Armazenamento Offline</label>
          <p className="text-xs text-[var(--muted)]">
            Limpar os dados salvos em cache no dispositivo caso haja conflito ou queira forçar sincronização total.
          </p>
          <div>
            <Button variant="subtle" onClick={handleClearCache} className="text-xs">
              Limpar cache offline
            </Button>
          </div>
        </div>

        {/* Informações do Sistema */}
        <div className="flex flex-col gap-1 border-t border-[var(--border)] pt-4 text-xs text-[var(--muted)]">
          <div className="flex justify-between">
            <span>Aplicativo:</span>
            <span className="font-medium text-[var(--text)]">z-notes v0.1.0</span>
          </div>
          <div className="flex justify-between">
            <span>Ambiente:</span>
            <span className="font-medium text-[var(--text)]">
              {isDesktop ? "Desktop (Tauri)" : "Navegador Web"}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
