import cron, { type ScheduledTask } from "node-cron";
import type { AppContext } from "../context.js";
import { createSnapshotIfChanged } from "./snapshot.js";
import { notifyBackupFailure } from "./notify.js";

/** Agenda o job diário de backup dentro do próprio processo. */
export function scheduleBackups(ctx: AppContext): ScheduledTask {
  const expression = ctx.cfg.backupCron;
  if (!cron.validate(expression)) {
    throw new Error(`Expressão cron inválida para backup: ${expression}`);
  }
  return cron.schedule(expression, () => runBackupJob(ctx));
}

/** Roda o backup e trata falhas (log + webhook), nunca propaga exceção para o chamador. */
export async function runBackupJob(ctx: AppContext): Promise<void> {
  try {
    const result = await createSnapshotIfChanged(ctx);
    if (result.created) {
      console.log(`[z-notes] backup criado: ${result.filename}`);
    }
  } catch (err) {
    console.error("[z-notes] falha ao gerar backup:", err);
    await notifyBackupFailure(ctx.cfg.backupWebhookUrl, err);
  }
}
