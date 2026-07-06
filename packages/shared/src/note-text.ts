const DEFAULT_TITLE = "Nova nota";

/** Título = primeira linha não vazia do conteúdo (estilo Simplenote). */
export function deriveTitle(contentMd: string): string {
  const firstLine = contentMd
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!firstLine) return DEFAULT_TITLE;
  const withoutHeading = firstLine.replace(/^#+\s*/, "").trim();
  return withoutHeading || DEFAULT_TITLE;
}

/** Trecho para a lista: primeiras palavras do corpo, ignorando a linha do título. */
export function deriveExcerpt(contentMd: string, maxChars = 120): string {
  const nonEmpty = contentMd
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const body = nonEmpty.slice(1).join(" ").replace(/\s+/g, " ").trim();
  if (body.length <= maxChars) return body;
  return body.slice(0, maxChars).trimEnd() + "…";
}
