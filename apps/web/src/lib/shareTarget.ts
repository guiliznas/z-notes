export interface SharePayload {
  title?: string | null;
  text?: string | null;
  url?: string | null;
}

export interface PendingShare {
  content: string;
  source: "share";
  savedAt: number;
}

export const PENDING_SHARE_KEY = "znotes:pending_share";
export const PENDING_SHARE_EXPIRY_MS = 15 * 60 * 1000; // 15 minutos

/**
 * Normaliza parâmetros recebidos via Web Share Target (title, text, url).
 *
 * Diferentes apps no Android enviam de formas distintas:
 * - Chrome: title + url (text vazio)
 * - YouTube: title + text (com a url repetida em text e url)
 * - WhatsApp / apps de texto: apenas text (ou text com link embutido)
 * - Outros: title igual a text, ou title igual a url
 *
 * A normalização junta os campos relevantes sem duplicações indesejadas.
 */
export function normalizeSharePayload(payload: SharePayload): string {
  const rawTitle = (payload.title ?? "").trim();
  const rawText = (payload.text ?? "").trim();
  const rawUrl = (payload.url ?? "").trim();

  if (!rawTitle && !rawText && !rawUrl) {
    return "";
  }

  const parts: string[] = [];

  // Verifica se o texto já engloba a URL
  const textHasUrl = rawUrl !== "" && (rawText === rawUrl || rawText.includes(rawUrl));

  // Verifica se o título é a própria URL
  const titleIsUrl = rawUrl !== "" && (rawTitle === rawUrl || rawTitle.toLowerCase() === rawUrl.toLowerCase());

  // Verifica se o texto já engloba o título
  const textHasTitle =
    rawTitle !== "" &&
    (rawText === rawTitle ||
      rawText.toLowerCase() === rawTitle.toLowerCase() ||
      rawText.includes(rawTitle) ||
      rawText.startsWith(rawTitle));

  // Adiciona o título se for relevante e não duplicado
  if (rawTitle && !titleIsUrl && !textHasTitle) {
    parts.push(rawTitle);
  }

  // Adiciona o texto se houver
  if (rawText) {
    parts.push(rawText);
  }

  // Adiciona a URL se ainda não estiver presente no texto ou nas partes
  if (rawUrl && !textHasUrl && !parts.includes(rawUrl)) {
    parts.push(rawUrl);
  }

  return parts.join("\n").trim();
}

/**
 * Extrai os parâmetros de compartilhamento a partir de uma busca (URLSearchParams ou string).
 */
export function extractSharePayload(search: string | URLSearchParams): SharePayload {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  return {
    title: params.get("title"),
    text: params.get("text"),
    url: params.get("url"),
  };
}

/**
 * Verifica se os parâmetros de busca contêm algum dado de compartilhamento.
 */
export function hasShareParams(search: string | URLSearchParams): boolean {
  const payload = extractSharePayload(search);
  return Boolean(
    (payload.title && payload.title.trim()) ||
    (payload.text && payload.text.trim()) ||
    (payload.url && payload.url.trim())
  );
}

/**
 * Salva um conteúdo compartilhado no localStorage para ser recuperado após login.
 */
export function savePendingShare(content: string): void {
  const trimmed = content.trim();
  if (!trimmed || typeof window === "undefined" || !window.localStorage) return;

  try {
    const data: PendingShare = {
      content: trimmed,
      source: "share",
      savedAt: Date.now(),
    };
    window.localStorage.setItem(PENDING_SHARE_KEY, JSON.stringify(data));
  } catch {
    // Ignora erros de cota ou navegação anônima restrita
  }
}

/**
 * Recupera o compartilhamento pendente se ainda estiver dentro da validade (15 min).
 */
export function getPendingShare(): PendingShare | null {
  if (typeof window === "undefined" || !window.localStorage) return null;

  try {
    const raw = window.localStorage.getItem(PENDING_SHARE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw) as PendingShare;
    if (!data || typeof data.content !== "string") {
      clearPendingShare();
      return null;
    }

    // Se expirou, descarta
    if (Date.now() - data.savedAt > PENDING_SHARE_EXPIRY_MS) {
      clearPendingShare();
      return null;
    }

    return data;
  } catch {
    clearPendingShare();
    return null;
  }
}

/**
 * Remove o compartilhamento pendente do localStorage.
 */
export function clearPendingShare(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.removeItem(PENDING_SHARE_KEY);
  } catch {}
}
