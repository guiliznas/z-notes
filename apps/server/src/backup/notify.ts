const TIMEOUT_MS = 5000;

/** Notifica falha de backup via webhook HTTP. Best-effort — nunca lança. */
export async function notifyBackupFailure(webhookUrl: string | undefined, error: unknown): Promise<void> {
  if (!webhookUrl) return;
  const message = error instanceof Error ? error.message : String(error);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "backup_failed", error: message, timestamp: Date.now() }),
      signal: controller.signal,
    });
  } catch {
    // notificação é best-effort; falha aqui não deve derrubar o job de backup.
  } finally {
    clearTimeout(timer);
  }
}
