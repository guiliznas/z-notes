import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";

const here = path.dirname(fileURLToPath(import.meta.url));
/** repo root: apps/server/src -> ../../.. */
export const REPO_ROOT = path.resolve(here, "../../..");
export const WEB_DIST = path.join(REPO_ROOT, "apps/web/dist");

export interface AppConfig {
  dataDir: string;
  dbPath: string;
  mirrorDir: string;
  /** hash bcrypt da senha de acesso. */
  passwordHash: string;
  sessionSecret: string;
  isProd: boolean;
}

const DEFAULT_PASSWORD = "changeme";
const DEFAULT_SECRET = "dev-insecure-secret-change-me";

/** Resolve a configuração a partir das variáveis de ambiente (uso em produção/dev). */
export function configFromEnv(): AppConfig {
  const dataDir = process.env.Z_NOTES_DATA_DIR ?? path.join(REPO_ROOT, "data");
  const passwordHash = resolvePasswordHash();
  return {
    dataDir,
    dbPath: path.join(dataDir, "z-notes.db"),
    mirrorDir: path.join(dataDir, "mirror"),
    passwordHash,
    sessionSecret: process.env.Z_NOTES_SESSION_SECRET ?? DEFAULT_SECRET,
    isProd: process.env.NODE_ENV === "production",
  };
}

function resolvePasswordHash(): string {
  const explicitHash = process.env.Z_NOTES_PASSWORD_HASH;
  if (explicitHash) return explicitHash;
  const plain = process.env.Z_NOTES_PASSWORD ?? DEFAULT_PASSWORD;
  return bcrypt.hashSync(plain, 10);
}

/** Monta um AppConfig apontando para diretórios arbitrários (usado nos testes). */
export function makeConfig(overrides: Partial<AppConfig> & { dataDir: string }): AppConfig {
  return {
    dbPath: path.join(overrides.dataDir, "z-notes.db"),
    mirrorDir: path.join(overrides.dataDir, "mirror"),
    passwordHash: bcrypt.hashSync(DEFAULT_PASSWORD, 8),
    sessionSecret: DEFAULT_SECRET,
    isProd: false,
    ...overrides,
  };
}
