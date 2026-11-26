import type { InboxItem } from "@z-notes/shared";

const DAY_MS = 86_400_000;

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Formata o separador de dia no histórico do chat ("Hoje", "Ontem" ou data em PT-BR). */
export function formatDaySeparator(ts: number, now: Date = new Date()): string {
  const date = new Date(ts);
  if (isSameDay(date, now)) return "Hoje";

  const yesterday = new Date(now.getTime() - DAY_MS);
  if (isSameDay(date, yesterday)) return "Ontem";

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
  }
  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

export function formatMessageTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export type TextSegment = { type: "text" | "link"; value: string };

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

/** Separa texto puro e links clicáveis preservando quebras de linha e pontuação. */
export function parseLinksInText(text: string): TextSegment[] {
  if (!text) return [];
  const parts = text.split(URL_REGEX);
  const segments: TextSegment[] = [];

  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("http://") || part.startsWith("https://")) {
      segments.push({ type: "link", value: part });
    } else {
      segments.push({ type: "text", value: part });
    }
  }
  return segments;
}

export type InboxTimelineEntry =
  | { type: "separator"; id: string; label: string }
  | { type: "item"; item: InboxItem };

/**
 * Organiza a lista de mensagens do Inbox (esperada em ordem cronológica ascendente)
 * intercalando separadores de dia quando o dia muda.
 */
export function buildInboxTimeline(items: InboxItem[], now: Date = new Date()): InboxTimelineEntry[] {
  const entries: InboxTimelineEntry[] = [];
  let lastDateKey = "";

  for (const item of items) {
    const d = new Date(item.capturedAt);
    const dateKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

    if (dateKey !== lastDateKey) {
      lastDateKey = dateKey;
      entries.push({
        type: "separator",
        id: `sep-${dateKey}`,
        label: formatDaySeparator(item.capturedAt, now),
      });
    }

    entries.push({
      type: "item",
      item,
    });
  }

  return entries;
}
