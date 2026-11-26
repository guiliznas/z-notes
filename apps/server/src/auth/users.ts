import fs from "node:fs";
import { eq, isNull, ne, sql } from "drizzle-orm";
import type { AppContext } from "../context.js";
import { userMirrorDir } from "../config.js";
import { users, notes, folders, tasks, taskLists, taskFolders, inboxItems, type UserRow } from "../db/schema.js";

export type { UserRow };

export interface GoogleProfile {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
}

/** Marca a conta de teste em `google_sub` (o `sub` do Google é só numérico, não colide). */
export const TEST_USER_SUB = "password:test-user";

export function getUserById(ctx: AppContext, id: number): UserRow | undefined {
  return ctx.db.select().from(users).where(eq(users.id, id)).get();
}

/** Dono de uma sessão válida: com o login por senha desligado, a sessão da conta de teste deixa de valer. */
export function getSessionUser(ctx: AppContext, id: number): UserRow | undefined {
  const user = getUserById(ctx, id);
  if (user?.googleSub === TEST_USER_SUB && !ctx.cfg.testUser) return undefined;
  return user;
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
 * Só executa quando existe exatamente 1 usuário (a conta de teste não conta) — nunca "rouba" dados de outra conta.
 * O `mirrorPath` das notas adotadas é zerado; o chamador regenera o espelho do usuário.
 */
export function adoptOrphanData(ctx: AppContext, userId: number): AdoptionResult {
  const realUsers =
    ctx.db.select({ count: sql<number>`count(*)` }).from(users).where(ne(users.googleSub, TEST_USER_SUB)).get()
      ?.count ?? 0;
  if (realUsers !== 1) return { notes: 0, folders: 0 };
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

/**
 * Exclui definitivamente a conta e todos os dados vinculados (notas, pastas, tarefas, Inbox e espelho .md).
 * Exigência da Google Play e LGPD.
 */
export function deleteUserAccount(ctx: AppContext, userId: number): boolean {
  const existing = getUserById(ctx, userId);
  if (!existing) return false;
  ctx.sqlite.transaction(() => {
    // Todas referenciam users(id): sobrando uma linha, a FK impede a exclusão da conta.
    ctx.db.delete(tasks).where(eq(tasks.userId, userId)).run();
    ctx.db.delete(taskLists).where(eq(taskLists.userId, userId)).run();
    ctx.db.delete(taskFolders).where(eq(taskFolders.userId, userId)).run();
    ctx.db.delete(inboxItems).where(eq(inboxItems.userId, userId)).run();
    ctx.db.delete(notes).where(eq(notes.userId, userId)).run();
    ctx.db.update(folders).set({ parentId: null }).where(eq(folders.userId, userId)).run();
    ctx.db.delete(folders).where(eq(folders.userId, userId)).run();
    ctx.db.delete(users).where(eq(users.id, userId)).run();
  })();
  fs.rmSync(userMirrorDir(ctx.cfg, userId), { recursive: true, force: true });
  return true;
}
