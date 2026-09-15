import { eq, isNull, sql } from "drizzle-orm";
import type { AppContext } from "../context.js";
import { users, notes, folders, type UserRow } from "../db/schema.js";

export type { UserRow };

export interface GoogleProfile {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

export function getUserById(ctx: AppContext, id: number): UserRow | undefined {
  return ctx.db.select().from(users).where(eq(users.id, id)).get();
}

export function countUsers(ctx: AppContext): number {
  return ctx.db.select({ count: sql<number>`count(*)` }).from(users).get()?.count ?? 0;
}

function isAdminEmail(ctx: AppContext, email: string): boolean {
  return ctx.cfg.adminEmails.includes(email.trim().toLowerCase());
}

/** Liga/desliga o papel admin de um usuário. */
export function setAdmin(ctx: AppContext, userId: number, isAdmin: boolean): void {
  ctx.db
    .update(users)
    .set({ isAdmin: isAdmin ? 1 : 0, updatedAt: Date.now() })
    .where(eq(users.id, userId))
    .run();
}

/** Cria o usuário no primeiro login ou atualiza os dados do perfil (mesmo `sub`). */
export function upsertUserByGoogle(ctx: AppContext, profile: GoogleProfile): UserRow {
  const now = Date.now();
  const isAdmin = isAdminEmail(ctx, profile.email) ? 1 : 0;
  const existing = ctx.db.select().from(users).where(eq(users.googleSub, profile.sub)).get();
  if (existing) {
    return ctx.db
      .update(users)
      .set({
        email: profile.email,
        name: profile.name ?? null,
        avatarUrl: profile.picture ?? null,
        isAdmin,
        updatedAt: now,
      })
      .where(eq(users.id, existing.id))
      .returning()
      .get();
  }
  return ctx.db
    .insert(users)
    .values({
      googleSub: profile.sub,
      email: profile.email,
      name: profile.name ?? null,
      avatarUrl: profile.picture ?? null,
      isAdmin,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .get();
}

export interface AdoptionResult {
  notes: number;
  folders: number;
}

/**
 * Primeiro login adota as linhas legadas da era single-tenant (`user_id` NULL).
 * Só executa quando existe exatamente 1 usuário — nunca "rouba" dados de outra conta.
 * O `mirrorPath` das notas adotadas é zerado; o chamador regenera o espelho do usuário.
 */
export function adoptOrphanData(ctx: AppContext, userId: number): AdoptionResult {
  if (countUsers(ctx) !== 1) return { notes: 0, folders: 0 };
  const now = Date.now();
  const adoptedNotes = ctx.db
    .update(notes)
    .set({ userId, mirrorPath: null, updatedAt: now })
    .where(isNull(notes.userId))
    .returning({ id: notes.id })
    .all();
  const adoptedFolders = ctx.db
    .update(folders)
    .set({ userId, updatedAt: now })
    .where(isNull(folders.userId))
    .returning({ id: folders.id })
    .all();
  return { notes: adoptedNotes.length, folders: adoptedFolders.length };
}
