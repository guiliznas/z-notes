import fs from "node:fs";
import path from "node:path";

export interface SnapshotEntry {
  filename: string;
  createdAt: number;
  fingerprint: string;
}

export interface Manifest {
  snapshots: SnapshotEntry[];
}

function manifestPath(backupDir: string): string {
  return path.join(backupDir, "manifest.json");
}

export function readManifest(backupDir: string): Manifest {
  const file = manifestPath(backupDir);
  if (!fs.existsSync(file)) return { snapshots: [] };
  return JSON.parse(fs.readFileSync(file, "utf8")) as Manifest;
}

export function writeManifest(backupDir: string, manifest: Manifest): void {
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(manifestPath(backupDir), JSON.stringify(manifest, null, 2));
}

export function lastFingerprint(manifest: Manifest): string | null {
  if (manifest.snapshots.length === 0) return null;
  return manifest.snapshots[manifest.snapshots.length - 1].fingerprint;
}
