import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { makeTestCtx, type TestCtx } from "../test-helpers.js";
import { countUsers, upsertUserByGoogle, adoptOrphanData } from "../auth/users.js";
import { notes, folders } from "../db/schema.js";

describe("users", () => {
  let t: TestCtx;
  beforeEach(() => {
    t = makeTestCtx();
  });
  afterEach(() => {
    t.cleanup();
  });

  it("cria usuário no primeiro login", () => {
    const user = upsertUserByGoogle(t.ctx, { sub: "sub-1", email: "a@example.com", name: "A" });
    expect(user.id).toBeGreaterThan(0);
    expect(user.email).toBe("a@example.com");
    // ctx já vem com 1 usuário semeado.
    expect(countUsers(t.ctx)).toBe(2);
  });

  it("mesmo sub atualiza em vez de duplicar", () => {
    const first = upsertUserByGoogle(t.ctx, { sub: "sub-1", email: "a@example.com" });
    const second = upsertUserByGoogle(t.ctx, { sub: "sub-1", email: "b@example.com", name: "B" });
    expect(second.id).toBe(first.id);
    expect(second.email).toBe("b@example.com");
    expect(countUsers(t.ctx)).toBe(2);
  });

  it("usuário único adota linhas órfãs legadas", () => {
    const now = Date.now();
    const folder = t.ctx.db
      .insert(folders)
      .values({ name: "Antiga", parentId: null, position: 0, createdAt: now, updatedAt: now })
      .returning()
      .get();
    t.ctx.db
      .insert(notes)
      .values({ folderId: folder.id, contentMd: "legada", version: 1, createdAt: now, updatedAt: now })
      .run();
    // Só existe o usuário semeado: ele é o "primeiro login" e adota tudo.
    const adopted = adoptOrphanData(t.ctx, t.userId);
    expect(adopted).toEqual({ notes: 1, folders: 1 });
  });

  it("segundo usuário nunca adota órfãs de outro", () => {
    const now = Date.now();
    t.ctx.db
      .insert(notes)
      .values({ folderId: null, contentMd: "órfã", version: 1, createdAt: now, updatedAt: now })
      .run();
    upsertUserByGoogle(t.ctx, { sub: "sub-1", email: "a@example.com" });
    const second = upsertUserByGoogle(t.ctx, { sub: "sub-2", email: "b@example.com" });
    // Primeira adoção (primeiro usuário ainda é o único no momento do seu login):
    // simula a ordem real — adota para o primeiro antes do segundo existir.
    expect(adoptOrphanData(t.ctx, second.id)).toEqual({ notes: 0, folders: 0 });
  });
});
