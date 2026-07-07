import readline from "node:readline/promises";
import fs from "node:fs";
import { configFromEnv } from "../src/config.js";
import { applySnapshot } from "../src/backup/restore.js";

async function main(): Promise<void> {
  const [, , snapshotPath, ...flags] = process.argv;
  if (!snapshotPath) {
    console.error('uso: pnpm --filter @z-notes/server restore <caminho-do-snapshot.zip> [--yes]');
    process.exit(1);
  }
  if (!fs.existsSync(snapshotPath)) {
    console.error(`Arquivo não encontrado: ${snapshotPath}`);
    process.exit(1);
  }

  const cfg = configFromEnv();
  console.log(`Isso vai SUBSTITUIR o banco e o espelho atuais em ${cfg.dataDir}.`);
  console.log("Certifique-se de que o servidor está PARADO antes de continuar.");

  if (!flags.includes("--yes")) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question('Digite "restaurar" para confirmar: ');
    rl.close();
    if (answer.trim() !== "restaurar") {
      console.log("Cancelado.");
      process.exit(1);
    }
  }

  const { safetyDir } = await applySnapshot(cfg, snapshotPath);
  console.log(`Estado anterior preservado em: ${safetyDir}`);
  console.log("Restauração concluída. Reinicie o servidor agora.");
}

main().catch((err) => {
  console.error("Falha na restauração:", err);
  process.exit(1);
});
