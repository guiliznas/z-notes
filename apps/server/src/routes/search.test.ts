import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { makeTestApp, type TestApp } from "../test-helpers.js";

describe("search", () => {
  let t: TestApp;
  let folderId: number;

  beforeEach(async () => {
    t = await makeTestApp();
    const root = await t.app.inject({
      method: "POST",
      url: "/api/folders",
      payload: { name: "Docs" },
      headers: { cookie: t.cookie },
    });
    folderId = root.json().id;
  });
  afterEach(async () => {
    await t.cleanup();
  });

  const post = (url: string, payload: Record<string, unknown>) =>
    t.app.inject({ method: "POST", url, payload, headers: { cookie: t.cookie } });
  const get = (url: string) => t.app.inject({ method: "GET", url, headers: { cookie: t.cookie } });

  it("encontra por conteúdo", async () => {
    await post("/api/notes", { folderId, contentMd: "Como configurar Siri no Calendar" });
    await post("/api/notes", { folderId, contentMd: "Lista de compras" });
    const hits = (await get("/api/search?q=siri")).json();
    expect(hits).toHaveLength(1);
    expect(hits[0].note.title).toContain("Siri");
    expect(hits[0].snippet).toContain("[");
  });

  it("busca por prefixo", async () => {
    await post("/api/notes", { folderId, contentMd: "Calendário anual" });
    const hits = (await get("/api/search?q=calend")).json();
    expect(hits.length).toBeGreaterThanOrEqual(1);
  });

  it("não retorna notas na lixeira", async () => {
    const note = (await post("/api/notes", { folderId, contentMd: "segredo apagado" })).json();
    await t.app.inject({ method: "DELETE", url: `/api/notes/${note.id}`, headers: { cookie: t.cookie } });
    const hits = (await get("/api/search?q=segredo")).json();
    expect(hits).toHaveLength(0);
  });

  it("query vazia retorna vazio", async () => {
    await post("/api/notes", { folderId, contentMd: "qualquer coisa" });
    const hits = (await get("/api/search?q=")).json();
    expect(hits).toHaveLength(0);
  });
});
