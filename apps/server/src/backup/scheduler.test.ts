import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "node:fs";
import { makeTestCtx, type TestCtx } from "../test-helpers.js";

vi.mock("./notify.js", () => ({
  notifyBackupFailure: vi.fn().mockResolvedValue(undefined),
}));

import { scheduleBackups, runBackupJob } from "./scheduler.js";
import { notifyBackupFailure } from "./notify.js";

describe("scheduleBackups", () => {
  let t: TestCtx;
  afterEach(() => {
    t?.cleanup();
  });

  it("agenda e para sem lançar exceção", () => {
    t = makeTestCtx();
    const task = scheduleBackups(t.ctx);
    expect(task).toBeDefined();
    task.stop();
  });

  it("rejeita expressão cron inválida", () => {
    t = makeTestCtx();
    t.ctx.cfg.backupCron = "não é cron válido";
    expect(() => scheduleBackups(t.ctx)).toThrow(/inválida/);
  });
});

describe("runBackupJob", () => {
  let t: TestCtx;
  afterEach(() => {
    vi.clearAllMocks();
    t?.cleanup();
  });

  it("nunca propaga exceção e notifica falha", async () => {
    t = makeTestCtx();
    // força uma falha: backupDir aponta para um caminho onde já existe um arquivo (mkdirSync falha)
    const invalidPath = `${t.cfg.dataDir}-as-file`;
    fs.writeFileSync(invalidPath, "x");
    t.ctx.cfg.backupDir = invalidPath;

    await expect(runBackupJob(t.ctx)).resolves.toBeUndefined();
    expect(notifyBackupFailure).toHaveBeenCalledTimes(1);

    fs.rmSync(invalidPath, { force: true });
  });
});
