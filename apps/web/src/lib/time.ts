const DAY_MS = 86_400_000;

/** Data relativa curta em PT-BR, estilo Apple Notes (hora hoje, "Ontem", dia da semana, data). */
export function relativeTime(ts: number, now: Date = new Date()): string {
  const date = new Date(ts);
  if (isSameDay(date, now)) {
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now.getTime() - DAY_MS);
  if (isSameDay(date, yesterday)) return "Ontem";

  const diffDays = Math.floor((startOfDay(now) - startOfDay(date)) / DAY_MS);
  if (diffDays > 1 && diffDays < 7) {
    return capitalize(date.toLocaleDateString("pt-BR", { weekday: "long" }));
  }
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
