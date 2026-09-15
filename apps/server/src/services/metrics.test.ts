import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { makeTestCtx, type TestCtx } from "../test-helpers.js";
import { collectMetrics, recordMetrics, readMetricSeries, hasMetricSamples, METRIC_NAMES } from "./metrics.js";
import { createFolder } from "./folders.js";
import { createNote, trashNote, updateNote } from "./notes.js";
import { metricSamples } from "../db/schema.js";

describe("métricas", () => {
  let t: TestCtx;
  beforeEach(() => {
    t = makeTestCtx();
  });
  afterEach(() => {
    t.cleanup();
  });

  it("collectMetrics conta usuários, notas por estado e pastas", () => {
    const folder = createFolder(t.ctx, { name: "F" });
    const active = createNote(t.ctx, { folderId: folder.id, contentMd: "ativa" });
    const archived = createNote(t.ctx, { folderId: folder.id, contentMd: "arq" });
    updateNote(t.ctx, archived.id, { archived: true });
    const trashed = createNote(t.ctx, { folderId: folder.id, contentMd: "lixo" });
    trashNote(t.ctx, trashed.id);
    void active;

    const points = Object.fromEntries(collectMetrics(t.ctx).map((p) => [p.name, p.value]));
    expect(points).toMatchObject({
      users_total: 1,
      notes_total: 3,
      notes_active: 1,
      notes_archived: 1,
      notes_trash: 1,
      folders_total: 1,
    });
  });

  it("recordMetrics grava as 6 amostras e marca backfill", () => {
    expect(hasMetricSamples(t.ctx)).toBe(false);
    const points = recordMetrics(t.ctx);
    expect(points).toHaveLength(METRIC_NAMES.length);
    expect(hasMetricSamples(t.ctx)).toBe(true);
    const series = readMetricSeries(t.ctx);
    for (const name of METRIC_NAMES) {
      expect(series[name]).toHaveLength(1);
      expect(series[name][0].t).toBeGreaterThan(0);
    }
  });

  it("readMetricSeries ordena amostras no tempo", () => {
    recordMetrics(t.ctx, 1000);
    recordMetrics(t.ctx, 2000);
    const series = readMetricSeries(t.ctx);
    expect(series.users_total.map((s) => s.t)).toEqual([1000, 2000]);
    expect(series.users_total.map((s) => s.v)).toEqual([1, 1]);
  });

  it("poda amostras além da retenção de 1 ano", () => {
    const old = Date.now() - 400 * 24 * 60 * 60 * 1000;
    t.ctx.db.insert(metricSamples).values({ capturedAt: old, name: "users_total", value: 9 }).run();
    recordMetrics(t.ctx);
    const series = readMetricSeries(t.ctx);
    expect(series.users_total.map((s) => s.v)).not.toContain(9);
    expect(series.users_total.length).toBeGreaterThan(0);
  });
});
