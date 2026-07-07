import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import type { AppContext } from "../context.js";
import { addDirToZip } from "../lib/zip-fs.js";
import { isoStamp } from "../lib/iso-stamp.js";
import { computeFingerprint } from "./fingerprint.js";
import { readManifest, writeManifest, lastFingerprint, type Manifest, type SnapshotEntry } from "./manifest.js";
import { selectSnapshotsToDelete } from "./retention.js";

export interface SnapshotResult {
  created: boolean;
  filename?: string;
}

/** Gera um novo snapshot (banco + mirror) se o estado do banco mudou desde o último, e aplica a retenção. */
export async function createSnapshotIfChanged(ctx: AppContext): Promise<SnapshotResult> {
  const fingerprint = computeFingerprint(ctx);
  const manifest = readManifest(ctx.cfg.backupDir);
  if (lastFingerprint(manifest) === fingerprint) {
    return { created: false };
  }

  const filename = `${isoStamp(new Date())}.zip`;
  const stagingDbPath = path.join(ctx.cfg.backupDir, `.staging-${Date.now()}.db`);
  fs.mkdirSync(ctx.cfg.backupDir, { recursive: true });

  try {
    await ctx.sqlite.backup(stagingDbPath);
    const zip = new JSZip();
    zip.file("z-notes.db", fs.readFileSync(stagingDbPath));
    addDirToZip(zip, ctx.cfg.mirrorDir, "mirror");
    const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    fs.writeFileSync(path.join(ctx.cfg.backupDir, filename), buffer);
  } finally {
    fs.rmSync(stagingDbPath, { force: true });
  }

  const entry: SnapshotEntry = { filename, createdAt: Date.now(), fingerprint };
  manifest.snapshots.push(entry);
  writeManifest(ctx.cfg.backupDir, manifest);

  cleanupOldSnapshots(ctx, manifest);

  return { created: true, filename };
}

function cleanupOldSnapshots(ctx: AppContext, manifest: Manifest): void {
  const toDelete = selectSnapshotsToDelete(manifest.snapshots, Date.now());
  if (toDelete.length === 0) return;

  const deleteNames = new Set(toDelete.map((s) => s.filename));
  for (const entry of toDelete) {
    fs.rmSync(path.join(ctx.cfg.backupDir, entry.filename), { force: true });
  }
  manifest.snapshots = manifest.snapshots.filter((s) => !deleteNames.has(s.filename));
  writeManifest(ctx.cfg.backupDir, manifest);
}
