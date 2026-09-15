import type { AppConfig } from "./config.js";
import type { Db, Sqlite } from "./db/bootstrap.js";

export interface AppContext {
  db: Db;
  sqlite: Sqlite;
  cfg: AppConfig;
}

/**
 * Contexto por requisição autenticada: o `userId` é resolvido uma única vez
 * no `preHandler` (decorator de ownership) e todo service filtra por ele.
 * Cross-access retorna 404 (nunca 403, para não vazar existência).
 */
export interface RequestContext extends AppContext {
  userId: number;
}
