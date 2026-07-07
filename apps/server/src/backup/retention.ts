export interface SnapshotMeta {
  filename: string;
  createdAt: number;
}

const DAY_MS = 86_400_000;
const WEEK_MS = DAY_MS * 7;
const DAILY_WINDOW_MS = 7 * DAY_MS;
const WEEKLY_WINDOW_MS = 8 * WEEK_MS;

/**
 * Regra de retenção avô-pai-filho (GFS):
 * - idade < 7 dias: mantém todos
 * - 7 dias ≤ idade < 7 dias + 8 semanas: mantém 1 por bucket semanal
 * - idade ≥ 7 dias + 8 semanas: mantém 1 por bucket mensal (para sempre)
 * Retorna os snapshots que devem ser apagados.
 */
export function selectSnapshotsToDelete(snapshots: SnapshotMeta[], now: number): SnapshotMeta[] {
  const dailyBoundary = now - DAILY_WINDOW_MS;
  const weeklyBoundary = dailyBoundary - WEEKLY_WINDOW_MS;

  const daily = snapshots.filter((s) => s.createdAt > dailyBoundary);
  const weeklyCandidates = snapshots.filter((s) => s.createdAt <= dailyBoundary && s.createdAt > weeklyBoundary);
  const monthlyCandidates = snapshots.filter((s) => s.createdAt <= weeklyBoundary);

  const keepWeekly = keepNewestPerBucket(weeklyCandidates, (ts) => Math.floor(ts / WEEK_MS));
  const keepMonthly = keepNewestPerBucket(monthlyCandidates, monthKey);

  const keep = new Set([...daily, ...keepWeekly, ...keepMonthly].map((s) => s.filename));
  return snapshots.filter((s) => !keep.has(s.filename));
}

function keepNewestPerBucket(items: SnapshotMeta[], bucketFn: (ts: number) => string | number): SnapshotMeta[] {
  const byBucket = new Map<string | number, SnapshotMeta>();
  for (const item of items) {
    const key = bucketFn(item.createdAt);
    const existing = byBucket.get(key);
    if (!existing || item.createdAt > existing.createdAt) byBucket.set(key, item);
  }
  return [...byBucket.values()];
}

function monthKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
}
