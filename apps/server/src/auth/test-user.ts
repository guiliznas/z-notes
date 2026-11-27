import { createHash, timingSafeEqual } from "node:crypto";
import type { AppContext } from "../context.js";
import type { TestUserConfig } from "../config.js";
import { upsertUserByGoogle, TEST_USER_SUB, type UserRow } from "./users.js";

/** Domínio reservado (RFC 2606): a conta de teste nunca colide com um e-mail real nem vira admin. */
const TEST_USER_EMAIL = "usuario-de-teste@z-notes.invalid";

/** Compara digests de tamanho fixo em tempo constante (não vaza tamanho nem prefixo correto). */
function safeEqual(a: string, b: string): boolean {
  const digest = (v: string) => createHash("sha256").update(v).digest();
  return timingSafeEqual(digest(a), digest(b));
}

export function matchesTestCredentials(expected: TestUserConfig, username: string, password: string): boolean {
  // As duas comparações sempre rodam: o tempo de resposta não revela qual delas falhou.
  const userOk = safeEqual(username.trim(), expected.username);
  const passwordOk = safeEqual(password, expected.password);
  return userOk && passwordOk;
}

/** Cria a conta de teste no primeiro login (ou de novo, se ela foi excluída). */
export function upsertTestUser(ctx: AppContext, username: string): UserRow {
  return upsertUserByGoogle(ctx, { sub: TEST_USER_SUB, email: TEST_USER_EMAIL, name: username });
}
