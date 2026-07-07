import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import type { AppConfig } from "../config.js";
import { extractZipToDir } from "../lib/zip-fs.js";
import { isoStamp } from "../lib/iso-stamp.js";

export interface RestoreResult {
  safetyDir: string;
}

/** Sufixos de arquivo que o SQLite mantém junto ao `.db` em modo WAL. */
const SQLITE_SIDECAR_SUFFIXES = ["-wal", "-shm"];

/**
 * Substitui banco + mirror pelo conteúdo do snapshot, preservando o estado
 * anterior em `data/.pre-restore-backup-<timestamp>/` antes de sobrescrever.
 *
 * Remove também os sidecars `-wal`/`-shm` do banco anterior: se o processo não
 * fechou a conexão de forma graciosa, esses arquivos podem conter transações
 * ainda não "checkpointadas" que, se deixadas no lugar, seriam reaplicadas por
 * cima do banco restaurado na próxima abertura — sobrescrevendo a restauração.
 */
export async function applySnapshot(cfg: AppConfig, snapshotPath: string): Promise<RestoreResult> {
  if (!fs.existsSync(snapshotPath)) {
    throw new Error(`Arquivo de snapshot não encontrado: ${snapshotPath}`);
  }

  const safetyDir = path.join(cfg.dataDir, `.pre-restore-backup-${isoStamp(new Date())}`);
  fs.mkdirSync(safetyDir, { recursive: true });
  if (fs.existsSync(cfg.dbPath)) fs.cpSync(cfg.dbPath, path.join(safetyDir, "z-notes.db"));
  for (const suffix of SQLITE_SIDECAR_SUFFIXES) {
    const sidecar = cfg.dbPath + suffix;
    if (fs.existsSync(sidecar)) fs.cpSync(sidecar, path.join(safetyDir, `z-notes.db${suffix}`));
  }
  if (fs.existsSync(cfg.mirrorDir)) fs.cpSync(cfg.mirrorDir, path.join(safetyDir, "mirror"), { recursive: true });

  const stagingDir = path.join(cfg.dataDir, `.restore-staging-${Date.now()}`);
  fs.mkdirSync(stagingDir, { recursive: true });
  try {
    const zip = await JSZip.loadAsync(fs.readFileSync(snapshotPath));
    await extractZipToDir(zip, stagingDir);

    fs.rmSync(cfg.dbPath, { force: true });
    for (const suffix of SQLITE_SIDECAR_SUFFIXES) fs.rmSync(cfg.dbPath + suffix, { force: true });
    fs.cpSync(path.join(stagingDir, "z-notes.db"), cfg.dbPath);

    fs.rmSync(cfg.mirrorDir, { recursive: true, force: true });
    fs.cpSync(path.join(stagingDir, "mirror"), cfg.mirrorDir, { recursive: true });
  } finally {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }

  return { safetyDir };
}
