import { describe, it, expect, beforeEach } from "vitest";
import { configFromEnv, makeConfig } from "./config.js";

describe("configFromEnv", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    delete process.env.Z_NOTES_PASSWORD_HASH;
    delete process.env.Z_NOTES_PASSWORD;
    delete process.env.Z_NOTES_DATA_DIR;
    delete process.env.Z_NOTES_SESSION_SECRET;
    delete process.env.Z_NOTES_JWT_SECRET;
    delete process.env.NODE_ENV;
    delete process.env.Z_NOTES_BACKUP_DIR;
    delete process.env.Z_NOTES_BACKUP_CRON;
    delete process.env.Z_NOTES_BACKUP_WEBHOOK_URL;
  });

  it("usa defaults quando nenhuma env é definida", () => {
    const cfg = configFromEnv();
    expect(cfg.passwordHash).toBeTruthy();
    expect(cfg.sessionSecret).toBe("dev-insecure-secret-change-me");
    expect(cfg.jwtSecret).toBe("dev-insecure-secret-change-me");
    expect(cfg.isProd).toBe(false);
    expect(cfg.backupCron).toBe("0 3 * * *");
    expect(cfg.backupWebhookUrl).toBeUndefined();
  });

  it("lê Z_NOTES_PASSWORD_HASH quando definida", () => {
    process.env.Z_NOTES_PASSWORD_HASH = "$2a$10$hashfake";
    const cfg = configFromEnv();
    expect(cfg.passwordHash).toBe("$2a$10$hashfake");
  });

  it("lê Z_NOTES_PASSWORD quando não há hash", () => {
    process.env.Z_NOTES_PASSWORD = "minha-senha";
    const cfg = configFromEnv();
    expect(cfg.passwordHash).not.toBe("minha-senha");
    expect(cfg.passwordHash).toMatch(/^\$2[ab]\$/);
  });

  it("detecta produção por NODE_ENV", () => {
    process.env.NODE_ENV = "production";
    expect(configFromEnv().isProd).toBe(true);
  });

  it("lê sessionSecret personalizado", () => {
    process.env.Z_NOTES_SESSION_SECRET = "meu-segredo";
    expect(configFromEnv().sessionSecret).toBe("meu-segredo");
  });

  it("lê backupCron personalizado", () => {
    process.env.Z_NOTES_BACKUP_CRON = "0 */6 * * *";
    expect(configFromEnv().backupCron).toBe("0 */6 * * *");
  });

  it("lê backupWebhookUrl quando definido", () => {
    process.env.Z_NOTES_BACKUP_WEBHOOK_URL = "https://hooks.example.com/fail";
    expect(configFromEnv().backupWebhookUrl).toBe("https://hooks.example.com/fail");
  });

  it("lê backupDir personalizado", () => {
    process.env.Z_NOTES_BACKUP_DIR = "/custom/backups";
    expect(configFromEnv().backupDir).toBe("/custom/backups");
  });

  it("lê dataDir personalizado", () => {
    process.env.Z_NOTES_DATA_DIR = "/custom/data";
    const cfg = configFromEnv();
    expect(cfg.dataDir).toBe("/custom/data");
    expect(cfg.dbPath).toContain("/custom/data");
    expect(cfg.mirrorDir).toContain("/custom/data");
  });
});

describe("makeConfig", () => {
  it("monta config com dataDir definido e defaults", () => {
    const cfg = makeConfig({ dataDir: "/tmp/test" });
    expect(cfg.dataDir).toBe("/tmp/test");
    expect(cfg.dbPath).toBe("/tmp/test/z-notes.db");
    expect(cfg.mirrorDir).toBe("/tmp/test/mirror");
    expect(cfg.passwordHash).toMatch(/^\$2[ab]\$/);
    expect(cfg.sessionSecret).toBe("dev-insecure-secret-change-me");
    expect(cfg.jwtSecret).toBe("dev-insecure-secret-change-me");
    expect(cfg.isProd).toBe(false);
    expect(cfg.backupDir).toBe("/tmp/test/backups");
    expect(cfg.backupCron).toBe("0 3 * * *");
  });

  it("permite sobrescrever campos específicos", () => {
    const cfg = makeConfig({
      dataDir: "/tmp/test",
      isProd: true,
      backupCron: "0 */2 * * *",
    });
    expect(cfg.isProd).toBe(true);
    expect(cfg.backupCron).toBe("0 */2 * * *");
  });
});
