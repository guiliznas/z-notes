import { configFromEnv } from "./config.js";
import { buildApp } from "./app.js";

const cfg = configFromEnv();

if (!process.env.Z_NOTES_PASSWORD && !process.env.Z_NOTES_PASSWORD_HASH) {
  console.warn("[z-notes] AVISO: usando senha padrão 'changeme'. Defina Z_NOTES_PASSWORD ou Z_NOTES_PASSWORD_HASH.");
}

const app = await buildApp(cfg);
const port = Number(process.env.PORT ?? 8787);

try {
  await app.listen({ port, host: "0.0.0.0" });
  console.log(`[z-notes] servidor em http://localhost:${port} (dados em ${cfg.dataDir})`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
