import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
/** repo root: apps/server/src -> ../../.. */
export const REPO_ROOT = path.resolve(here, "../../..");
export const WEB_DIST = path.join(REPO_ROOT, "apps/web/dist");

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
}

export interface AppConfig {
  dataDir: string;
  dbPath: string;
  mirrorDir: string;
  google: GoogleOAuthConfig;
  /** e-mails com acesso admin (CSV em Z_NOTES_ADMIN_EMAILS, minúsculos). */
  adminEmails: string[];
  sessionSecret: string;
  isProd: boolean;
  /** diretório dos snapshots de backup (separado do dataDir ativo). */
  backupDir: string;
  /** expressão cron do agendamento diário de backup. */
  backupCron: string;
  /** URL opcional para notificação (POST) em caso de falha no backup. */
  backupWebhookUrl?: string;
}

const DEV_SECRET = "dev-insecure-secret-change-me";
const DEFAULT_BACKUP_CRON = "0 3 * * *";
const DEV_CALLBACK_URL = "http://localhost:8787/api/auth/google/callback";

/** Segredo vazio ("") não pode cair no default silenciosamente: recusar em prod, avisar em dev. */
function resolveSessionSecret(isProd: boolean): string {
  const secret = process.env.Z_NOTES_SESSION_SECRET;
  if (secret) return secret;
  if (isProd) {
    throw new Error("[z-notes] Z_NOTES_SESSION_SECRET é obrigatório em produção (valor ausente ou vazio).");
  }
  console.warn("[z-notes] AVISO: Z_NOTES_SESSION_SECRET ausente — usando segredo inseguro de desenvolvimento.");
  return DEV_SECRET;
}

/** Base do espelho .md de um usuário: isolamento em disco por dono. */
export function userMirrorDir(cfg: AppConfig, userId: number): string {
  return path.join(cfg.mirrorDir, String(userId));
}

/** Monta a configuração a partir das variáveis de ambiente (uso em produção/dev). */
export function configFromEnv(): AppConfig {
  const dataDir = process.env.Z_NOTES_DATA_DIR ?? path.join(REPO_ROOT, "data");
  const isProd = process.env.NODE_ENV === "production";
  const google = {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    callbackUrl: process.env.GOOGLE_CALLBACK_URL ?? (isProd ? "" : DEV_CALLBACK_URL),
  };
  if (!google.clientId || !google.clientSecret || !google.callbackUrl) {
    console.warn(
      "[z-notes] AVISO: credenciais Google incompletas — o login ficará indisponível (503) até configurar GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL.",
    );
  }
  return {
    dataDir,
    dbPath: path.join(dataDir, "z-notes.db"),
    mirrorDir: path.join(dataDir, "mirror"),
    google,
    adminEmails: parseEmailList(process.env.Z_NOTES_ADMIN_EMAILS),
    sessionSecret: resolveSessionSecret(isProd),
    isProd,
    backupDir: process.env.Z_NOTES_BACKUP_DIR ?? path.join(REPO_ROOT, "backups"),
    backupCron: process.env.Z_NOTES_BACKUP_CRON ?? DEFAULT_BACKUP_CRON,
    backupWebhookUrl: process.env.Z_NOTES_BACKUP_WEBHOOK_URL,
  };
}

/** Normaliza CSV de e-mails para comparação (minúsculos, sem espaços/vazios). */
export function parseEmailList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Monta um AppConfig apontando para diretórios arbitrários (usado nos testes). */
export function makeConfig(overrides: Partial<AppConfig> & { dataDir: string }): AppConfig {
  return {
    dbPath: path.join(overrides.dataDir, "z-notes.db"),
    mirrorDir: path.join(overrides.dataDir, "mirror"),
    google: { clientId: "", clientSecret: "", callbackUrl: "" },
    adminEmails: [],
    sessionSecret: DEV_SECRET,
    isProd: false,
    backupDir: path.join(overrides.dataDir, "backups"),
    backupCron: DEFAULT_BACKUP_CRON,
    ...overrides,
  };
}
