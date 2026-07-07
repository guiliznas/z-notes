import fs from "node:fs";
import path from "node:path";
import type JSZip from "jszip";

/** Adiciona recursivamente todo o conteúdo de um diretório a um JSZip, sob o prefixo dado. */
export function addDirToZip(zip: JSZip, absDir: string, relBase: string): void {
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

/** Extrai todos os arquivos de um JSZip já carregado para um diretório no disco. */
export async function extractZipToDir(zip: JSZip, destDir: string): Promise<void> {
  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue;
    const abs = path.join(destDir, entry.name);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    const content = await entry.async("nodebuffer");
    fs.writeFileSync(abs, content);
  }
}
