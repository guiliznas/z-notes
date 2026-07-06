import type { AppConfig } from "./config.js";
import type { Db, Sqlite } from "./db/bootstrap.js";

export interface AppContext {
  db: Db;
  sqlite: Sqlite;
  cfg: AppConfig;
}
