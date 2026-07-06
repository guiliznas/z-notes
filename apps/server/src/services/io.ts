import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { and, eq, isNull } from "drizzle-orm";
import type { AppContext } from "../context.js";
import { folders, notes } from "../db/schema.js";
import { sanitizeSegment } from "../mirror/mirror.js";
import { syncNoteMirror, rebuildMirror } from "./mirror-sync.js";

const IMPORT_FALLBACK_FOLDER = "Importados";

export interface ImportEntry {
  /** segmentos de pasta do arquivo (ex.: ["Trabalho", "Reuniões"]); vazio = pasta padrão. */
  folderSegments: string[];
  content: string;
}

export interface ImportResult {
  notesImported: number;
}

/** Importa um lote de entradas .md, criando pastas conforme necessário. */
export function importEntries(ctx: AppContext, entries: ImportEntry[]): ImportResult {
  let count = 0;
  for (const entry of entries) {
    const { body, createdAt, updatedAt } = parseFrontmatter(entry.content);
    const segments = flattenSegments(entry.folderSegments);
    const folderId = ensurePath(ctx, segments.length ? segments : [IMPORT_FALLBACK_FOLDER]);
    const now = Date.now();
    const row = ctx.db
      .insert(notes)
      .values({
        folderId,
        contentMd: body,
        version: 1,
        createdAt: createdAt ?? now,
        updatedAt: updatedAt ?? now,
      })
      .returning()
      .get();
    syncNoteMirror(ctx, row.id);
    count++;
  }
  return { notesImported: count };
}

/** Achata caminhos com mais de 2 níveis: primeiro vira raiz, o resto é unido no segundo nível. */
function flattenSegments(segments: string[]): string[] {
  const clean = segments.map(sanitizeSegment).filter(Boolean);
  if (clean.length <= 2) return clean;
  return [clean[0], clean.slice(1).join(" — ")];
}

function ensurePath(ctx: AppContext, segments: string[]): number {
  let parentId: number | null = null;
  let currentId = 0;
  for (const name of segments) {
    currentId = ensureFolder(ctx, name, parentId);
    parentId = currentId;
  }
  return currentId;
}

function ensureFolder(ctx: AppContext, name: string, parentId: number | null): number {
  const where = parentId === null
    ? and(eq(folders.name, name), isNull(folders.parentId))
    : and(eq(folders.name, name), eq(folders.parentId, parentId));
  const existing = ctx.db.select().from(folders).where(where).get();
  if (existing) return existing.id;
  const now = Date.now();
  const created = ctx.db
    .insert(folders)
    .values({ name, parentId, position: 0, createdAt: now, updatedAt: now })
    .returning()
    .get();
  return created.id;
}

interface ParsedContent {
  body: string;
  createdAt?: number;
  updatedAt?: number;
}

/** Extrai e remove um bloco de frontmatter YAML (--- ... ---) no início, lendo created/updated. */
export function parseFrontmatter(raw: string): ParsedContent {
  const normalized = raw.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) return { body: normalized };
  const end = normalized.indexOf("\n---", 4);
  if (end === -1) return { body: normalized };
  const block = normalized.slice(4, end);
  const rest = normalized.slice(end + 4).replace(/^\n/, "");
  const created = readDate(block, "created");
  const updated = readDate(block, "updated");
  return { body: rest, createdAt: created, updatedAt: updated };
}

function readDate(block: string, key: string): number | undefined {
  const match = block.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  if (!match) return undefined;
  const value = Date.parse(match[1].trim());
  return Number.isNaN(value) ? undefined : value;
}

/** Descompacta um .zip em entradas de import (uma por arquivo .md). */
export async function zipToEntries(buffer: Buffer): Promise<ImportEntry[]> {
  const zip = await JSZip.loadAsync(buffer);
  const entries: ImportEntry[] = [];
  const files = Object.values(zip.files).filter((f) => !f.dir && f.name.toLowerCase().endsWith(".md"));
  for (const file of files) {
    const content = await file.async("string");
    const parts = file.name.split("/").filter(Boolean);
    const folderSegments = parts.slice(0, -1);
    entries.push({ folderSegments, content });
  }
  return entries;
}

/** Gera um .zip do espelho .md atual (regenerado antes para garantir consistência). */
export async function exportZip(ctx: AppContext): Promise<Buffer> {
  rebuildMirror(ctx);
  const zip = new JSZip();
  addDirToZip(zip, ctx.cfg.mirrorDir, "");
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

function addDirToZip(zip: JSZip, absDir: string, relBase: string): void {
  if (!fs.existsSync(absDir)) return;
  for (const entry of fs.readdirSync(absDir, { withFileTypes: true })) {
    const abs = path.join(absDir, entry.name);
    const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      addDirToZip(zip, abs, rel);
    } else {
      zip.file(rel, fs.readFileSync(abs));
    }
  }
}
