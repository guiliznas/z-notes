import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, isNull } from "drizzle-orm";
import type { AppContext, RequestContext } from "../context.js";
import { apiTokens } from "../db/schema.js";
import { badRequest, notFound } from "../errors.js";

export const TOKEN_PREFIX = "znt_";
export const DEFAULT_SCOPE = "inbox:write";

export interface GeneratedTokenResult {
  id: number;
  name: string;
  token: string;
  prefix: string;
  scope: string;
  createdAt: number;
}

export interface ApiTokenListItem {
  id: number;
  name: string;
  prefix: string;
  scope: string;
  createdAt: number;
  lastUsedAt: number | null;
  revokedAt: number | null;
  active: boolean;
}

export interface ValidatedToken {
  userId: number;
  tokenId: number;
  scope: string;
  name: string;
}

/** Computa o hash SHA-256 do token em hexadecimal. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Gera um novo token pessoal de API com prefixo `znt_`, salva o hash no banco e retorna o token em texto puro (uma única vez). */
export function generateApiToken(
  ctx: RequestContext,
  input: { name: string; scope?: string },
): GeneratedTokenResult {
  const name = input.name.trim();
  if (!name) throw badRequest("Nome do token é obrigatório");
  const scope = input.scope?.trim() || DEFAULT_SCOPE;

  // 32 bytes criptográficos aleatórios -> 64 caracteres hexadecimais
  const random = randomBytes(32).toString("hex");
  const token = `${TOKEN_PREFIX}${random}`;
  const prefix = `${TOKEN_PREFIX}${random.slice(0, 8)}…`;
  const tokenHash = hashToken(token);
  const now = Date.now();

  const inserted = ctx.db
    .insert(apiTokens)
    .values({
      userId: ctx.userId,
      name,
      tokenHash,
      tokenPrefix: prefix,
      scope,
      createdAt: now,
    })
    .returning()
    .get();

  return {
    id: inserted.id,
    name: inserted.name,
    token,
    prefix: inserted.tokenPrefix,
    scope: inserted.scope,
    createdAt: inserted.createdAt,
  };
}

/**
 * Valida um token de API recebido no cabeçalho Authorization: Bearer znt_...
 * Se for válido e não estiver revogado, atualiza last_used_at e retorna o userId e escopo.
 */
export function validateApiToken(ctx: AppContext, token: string): ValidatedToken | null {
  if (!token.startsWith(TOKEN_PREFIX)) return null;
  const tokenHash = hashToken(token);

  const row = ctx.db
    .select()
    .from(apiTokens)
    .where(and(eq(apiTokens.tokenHash, tokenHash), isNull(apiTokens.revokedAt)))
    .get();

  if (!row) return null;

  // Atualiza last_used_at
  const now = Date.now();
  ctx.db
    .update(apiTokens)
    .set({ lastUsedAt: now })
    .where(eq(apiTokens.id, row.id))
    .run();

  return {
    userId: row.userId,
    tokenId: row.id,
    scope: row.scope,
    name: row.name,
  };
}

/** Lista todos os tokens de API criados pelo usuário autenticado. */
export function listApiTokens(ctx: RequestContext): ApiTokenListItem[] {
  const rows = ctx.db
    .select({
      id: apiTokens.id,
      name: apiTokens.name,
      prefix: apiTokens.tokenPrefix,
      scope: apiTokens.scope,
      createdAt: apiTokens.createdAt,
      lastUsedAt: apiTokens.lastUsedAt,
      revokedAt: apiTokens.revokedAt,
    })
    .from(apiTokens)
    .where(eq(apiTokens.userId, ctx.userId))
    .orderBy(desc(apiTokens.createdAt))
    .all();

  return rows.map((r) => ({
    ...r,
    active: r.revokedAt === null,
  }));
}

/** Revoga imediatamente um token pertencente ao usuário autenticado. */
export function revokeApiToken(ctx: RequestContext, id: number): { success: boolean; id: number; revokedAt: number } {
  const existing = ctx.db
    .select()
    .from(apiTokens)
    .where(and(eq(apiTokens.id, id), eq(apiTokens.userId, ctx.userId)))
    .get();

  if (!existing) throw notFound("Token não encontrado");

  if (existing.revokedAt !== null) {
    return { success: true, id, revokedAt: existing.revokedAt };
  }

  const now = Date.now();
  ctx.db
    .update(apiTokens)
    .set({ revokedAt: now })
    .where(eq(apiTokens.id, id))
    .run();

  return { success: true, id, revokedAt: now };
}
