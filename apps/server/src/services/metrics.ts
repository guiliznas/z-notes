import cron, { type ScheduledTask } from "node-cron";
import { asc, sql } from "drizzle-orm";
import type { AppContext } from "../context.js";
import { metricSamples } from "../db/schema.js";

export const METRICS_CRON = "0 */6 * * *";
export const METRICS_RETENTION_DAYS = 365;

export const METRIC_NAMES = [
  "users_total",
  "notes_total",
  "notes_active",
  "notes_archived",
  "notes_trash",
  "folders_total",
] as const;

export interface MetricPoint {
  name: string;
  value: number;
}

export interface MetricSample {
  t: number;
  v: number;
}

function countRows(ctx: AppContext, table: "users" | "notes" | "folders", where = ""): number {
  const row = ctx.sqlite.prepare(`SELECT count(*) AS c FROM ${table} ${where}`).get() as { c: number };
  return row.c;
}

/** Fotografia atual dos indicadores (agregados; nenhum conteúdo de nota sai daqui). */
export function collectMetrics(ctx: AppContext): MetricPoint[] {
  return [
    { name: "users_total", value: countRows(ctx, "users") },
    { name: "notes_total", value: countRows(ctx, "notes") },
    { name: "notes_active", value: countRows(ctx, "notes", "WHERE deleted_at IS NULL AND archived_at IS NULL") },
    { name: "notes_archived", value: countRows(ctx, "notes", "WHERE deleted_at IS NULL AND archived_at IS NOT NULL") },
    { name: "notes_trash", value: countRows(ctx, "notes", "WHERE deleted_at IS NOT NULL") },
    { name: "folders_total", value: countRows(ctx, "folders") },
  ];
}

/** Grava uma amostra de todos os indicadores e poda amostras além da retenção. */
export function recordMetrics(ctx: AppContext, at = Date.now()): MetricPoint[] {
  const points = collectMetrics(ctx);
  for (const p of points) {
    ctx.db.insert(metricSamples).values({ capturedAt: at, name: p.name, value: p.value }).run();
  }
  const cutoff = at - METRICS_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  ctx.db
    .delete(metricSamples)
    .where(sql`${metricSamples.capturedAt} < ${cutoff}`)
    .run();
  return points;
}

export function hasMetricSamples(ctx: AppContext): boolean {
  return (ctx.db.select({ count: sql<number>`count(*)` }).from(metricSamples).get()?.count ?? 0) > 0;
}

/** Séries por indicador, ordenadas no tempo (para o dashboard admin). */
export function readMetricSeries(ctx: AppContext): Record<string, MetricSample[]> {
  const rows = ctx.db
    .select({ name: metricSamples.name, t: metricSamples.capturedAt, v: metricSamples.value })
    .from(metricSamples)
    .orderBy(asc(metricSamples.capturedAt))
    .all();
  const series: Record<string, MetricSample[]> = {};
  for (const name of METRIC_NAMES) series[name] = [];
  for (const r of rows) {
    (series[r.name] ??= []).push({ t: r.t, v: r.v });
  }
  return series;
}

/** Agenda a coleta a cada 6h dentro do próprio processo. */
export function scheduleMetrics(ctx: AppContext): ScheduledTask {
  if (!cron.validate(METRICS_CRON)) throw new Error(`Expressão cron inválida para métricas: ${METRICS_CRON}`);
  return cron.schedule(METRICS_CRON, () => runMetricsJob(ctx));
}

/** Roda a coleta tratando falhas (log), nunca propaga exceção para o chamador. */
export async function runMetricsJob(ctx: AppContext): Promise<void> {
  try {
    recordMetrics(ctx);
  } catch (err) {
    console.error("[z-notes] falha ao coletar métricas:", err);
  }
}
