import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { makeTestCtx, type TestCtx } from "../test-helpers.js";
import { createFolder } from "./folders.js";
import { createTaskFolder, createTaskList, updateTaskList, updateTaskFolder } from "./tasks.js";
import {
  convertInboxToNote,
  convertInboxToTask,
  countPendingInbox,
  createInboxItem,
  deleteInboxItem,
  getInboxItem,
  listInbox,
  updateInboxItem,
} from "./inbox.js";

describe("inbox service", () => {
  let t: TestCtx;

  beforeEach(() => {
    t = makeTestCtx();
  });

  afterEach(() => {
    t.cleanup();
  });

  describe("criação e idempotência", () => {
    it("cria item com sucesso e valores padrão", () => {
      const { item, created } = createInboxItem(t.ctx, {
        clientId: "uuid-1",
        content: "  Lembrar de comprar pão  ",
      });

      expect(created).toBe(true);
      expect(item.id).toBeGreaterThan(0);
      expect(item.clientId).toBe("uuid-1");
      expect(item.content).toBe("Lembrar de comprar pão");
      expect(item.source).toBe("api");
      expect(item.archived).toBe(false);
      expect(item.archivedAt).toBeNull();
      expect(item.resolvedKind).toBeNull();
      expect(item.resolvedId).toBeNull();
      expect(item.capturedAt).toBeGreaterThan(0);
    });

    it("idempotência: reenviar mesmo clientId não duplica e devolve item existente", () => {
      const first = createInboxItem(t.ctx, {
        clientId: "uuid-idempotent",
        content: "Captura original",
        source: "share",
      });
      expect(first.created).toBe(true);

      const second = createInboxItem(t.ctx, {
        clientId: "uuid-idempotent",
        content: "Tentativa de alteração",
      });
      expect(second.created).toBe(false);
      expect(second.item.id).toBe(first.item.id);
      expect(second.item.content).toBe("Captura original");
      expect(second.item.source).toBe("share");
    });

    it("rejeita conteúdo vazio ou apenas espaços", () => {
      expect(() =>
        createInboxItem(t.ctx, {
          clientId: "uuid-empty",
          content: "   ",
        }),
      ).toThrowError("Conteúdo é obrigatório");
    });

    it("rejeita conteúdo maior que 20.000 caracteres", () => {
      const longText = "a".repeat(20001);
      expect(() =>
        createInboxItem(t.ctx, {
          clientId: "uuid-too-long",
          content: longText,
        }),
      ).toThrowError("limite de 20.000 caracteres");
    });

    it("limita capturedAt no futuro para o momento atual", () => {
      const futureTime = Date.now() + 1000000;
      const { item } = createInboxItem(t.ctx, {
        clientId: "uuid-future",
        content: "Teste de data",
        capturedAt: futureTime,
      });

      expect(item.capturedAt).toBeLessThanOrEqual(Date.now());
    });
  });

  describe("listagem, contagem e paginação", () => {
    it("filtra por status pending, archived e resolved", () => {
      const folder = createFolder(t.ctx, { name: "Destino" });

      const item1 = createInboxItem(t.ctx, { clientId: "c-1", content: "Pendente 1" }).item;
      const item2 = createInboxItem(t.ctx, { clientId: "c-2", content: "Pendente 2" }).item;
      const item3 = createInboxItem(t.ctx, { clientId: "c-3", content: "Para arquivar" }).item;
      const item4 = createInboxItem(t.ctx, { clientId: "c-4", content: "Para resolver" }).item;

      updateInboxItem(t.ctx, item3.id, { archived: true });
      convertInboxToNote(t.ctx, item4.id, folder.id);

      const pending = listInbox(t.ctx, { status: "pending" });
      expect(pending.map((i) => i.id)).toEqual([item2.id, item1.id]);

      const archived = listInbox(t.ctx, { status: "archived" });
      expect(archived.map((i) => i.id)).toEqual([item3.id]);

      const resolved = listInbox(t.ctx, { status: "resolved" });
      expect(resolved.map((i) => i.id)).toEqual([item4.id]);

      expect(countPendingInbox(t.ctx)).toBe(2);
    });

    it("paginação por cursor com before e limit", () => {
      const t0 = 100000;
      const items = [];
      for (let i = 1; i <= 5; i++) {
        items.push(
          createInboxItem(t.ctx, {
            clientId: `page-${i}`,
            content: `Item ${i}`,
            capturedAt: t0 + i * 1000,
          }).item,
        );
      }

      // Ordenados do mais novo para o mais antigo: items[4], items[3], items[2], items[1], items[0]
      const page1 = listInbox(t.ctx, { limit: 2 });
      expect(page1.map((i) => i.id)).toEqual([items[4].id, items[3].id]);

      const page2 = listInbox(t.ctx, { before: page1[1].id, limit: 2 });
      expect(page2.map((i) => i.id)).toEqual([items[2].id, items[1].id]);

      const page3 = listInbox(t.ctx, { before: page2[1].id, limit: 2 });
      expect(page3.map((i) => i.id)).toEqual([items[0].id]);
    });
  });

  describe("arquivamento e exclusão", () => {
    it("arquiva e desarquiva item", () => {
      const { item } = createInboxItem(t.ctx, { clientId: "arch-1", content: "Item" });
      expect(item.archived).toBe(false);

      const archived = updateInboxItem(t.ctx, item.id, { archived: true });
      expect(archived.archived).toBe(true);
      expect(archived.archivedAt).toBeGreaterThan(0);

      const unarchived = updateInboxItem(t.ctx, item.id, { archived: false });
      expect(unarchived.archived).toBe(false);
      expect(unarchived.archivedAt).toBeNull();
    });

    it("exclui item definitivamente", () => {
      const { item } = createInboxItem(t.ctx, { clientId: "del-1", content: "Deletar" });
      deleteInboxItem(t.ctx, item.id);

      expect(() => getInboxItem(t.ctx, item.id)).toThrowError("Item do inbox não encontrado");
    });
  });

  describe("conversão para tarefa e nota", () => {
    it("converte para tarefa e repetição devolve o mesmo resultado (idempotente)", () => {
      const taskFolder = createTaskFolder(t.ctx, { name: "Quadro" });
      const taskList = createTaskList(t.ctx, { folderId: taskFolder.id, name: "Inbox Coluna" });

      const multiLineContent = "Título da tarefa principal\nLinha dois com detalhes\nLinha três";
      const { item } = createInboxItem(t.ctx, { clientId: "to-task-1", content: multiLineContent });

      const res1 = convertInboxToTask(t.ctx, item.id, taskList.id);
      expect(res1.item.resolvedKind).toBe("task");
      expect(res1.item.resolvedId).toBe(res1.task.id);
      expect(res1.task.listId).toBe(taskList.id);
      expect(res1.task.title).toBe("Título da tarefa principal");
      expect(res1.task.contentMd).toBe("Linha dois com detalhes\nLinha três");

      // Repetição devolve a mesma tarefa sem duplicar
      const res2 = convertInboxToTask(t.ctx, item.id, taskList.id);
      expect(res2.task.id).toBe(res1.task.id);
      expect(res2.item.id).toBe(item.id);
    });

    it("preserva todo o texto de mensagem longa do Inbox ao virar tarefa (critério 1)", () => {
      const taskFolder = createTaskFolder(t.ctx, { name: "Quadro" });
      const taskList = createTaskList(t.ctx, { folderId: taskFolder.id, name: "Inbox Coluna" });

      // Mensagem com primeira linha normal e corpo extenso
      const longMessage = `Comprar suprimentos para o escritório
- 10 cadernos pautados
- 5 caixas de caneta esferográfica preta
- 2 resmas de papel A4
- Café em grãos e filtros
Obs: Pegar a nota fiscal com o CNPJ da empresa para reembolso imediato.`;

      const { item } = createInboxItem(t.ctx, { clientId: "long-msg-1", content: longMessage });
      const res = convertInboxToTask(t.ctx, item.id, taskList.id);

      expect(res.task.title).toBe("Comprar suprimentos para o escritório");
      expect(res.task.contentMd).toBe(`- 10 cadernos pautados
- 5 caixas de caneta esferográfica preta
- 2 resmas de papel A4
- Café em grãos e filtros
Obs: Pegar a nota fiscal com o CNPJ da empresa para reembolso imediato.`);

      // Mensagem de linha única muito longa (> 500 caracteres) não perde os caracteres excedentes
      const singleLongLine = "A".repeat(600) + " e final do texto preservado";
      const { item: item2 } = createInboxItem(t.ctx, { clientId: "long-line-2", content: singleLongLine });
      const res2 = convertInboxToTask(t.ctx, item2.id, taskList.id);

      expect(res2.task.title).toBe("A".repeat(500));
      expect(res2.task.contentMd).toBe("A".repeat(100) + " e final do texto preservado");
      // Total de caracteres de título + contentMd recupera a string original
      expect(res2.task.title + res2.task.contentMd).toBe(singleLongLine);
    });

    it("falha conversão para tarefa se lista estiver arquivada", () => {
      const taskFolder = createTaskFolder(t.ctx, { name: "Quadro" });
      const taskList = createTaskList(t.ctx, { folderId: taskFolder.id, name: "Arquivada" });
      updateTaskList(t.ctx, taskList.id, { archived: true });

      const { item } = createInboxItem(t.ctx, { clientId: "to-task-arch-list", content: "Tarefa" });

      expect(() => convertInboxToTask(t.ctx, item.id, taskList.id)).toThrowError(
        "Lista de destino está arquivada",
      );
    });

    it("falha conversão para tarefa se pasta da lista estiver arquivada", () => {
      const taskFolder = createTaskFolder(t.ctx, { name: "Quadro Arquivado" });
      const taskList = createTaskList(t.ctx, { folderId: taskFolder.id, name: "Lista" });
      updateTaskFolder(t.ctx, taskFolder.id, { archived: true });

      const { item } = createInboxItem(t.ctx, { clientId: "to-task-arch-folder", content: "Tarefa" });

      expect(() => convertInboxToTask(t.ctx, item.id, taskList.id)).toThrowError(
        "Pasta de destino está arquivada",
      );
    });

    it("falha conversão para tarefa se lista não existir", () => {
      const { item } = createInboxItem(t.ctx, { clientId: "to-task-no-list", content: "Tarefa" });
      expect(() => convertInboxToTask(t.ctx, item.id, 99999)).toThrowError(
        "Lista de destino não existe",
      );
    });

    it("converte para nota e repetição devolve o mesmo resultado (idempotente)", () => {
      const noteFolder = createFolder(t.ctx, { name: "Ideias" });

      const content = "Minha nota importante\nSegundo parágrafo com detalhes enriquecidos";
      const { item } = createInboxItem(t.ctx, { clientId: "to-note-1", content });

      const res1 = convertInboxToNote(t.ctx, item.id, noteFolder.id);
      expect(res1.item.resolvedKind).toBe("note");
      expect(res1.item.resolvedId).toBe(res1.note.id);
      expect(res1.note.folderId).toBe(noteFolder.id);
      expect(res1.note.title).toBe("Minha nota importante");
      expect(res1.note.contentMd).toBe(content);

      // Repetição
      const res2 = convertInboxToNote(t.ctx, item.id, noteFolder.id);
      expect(res2.note.id).toBe(res1.note.id);
      expect(res2.item.id).toBe(item.id);
    });

    it("falha conversão para nota se pasta não existir", () => {
      const { item } = createInboxItem(t.ctx, { clientId: "to-note-no-folder", content: "Nota" });
      expect(() => convertInboxToNote(t.ctx, item.id, 99999)).toThrowError(
        "Pasta de destino não existe",
      );
    });

    it("impede converter para tipo diferente quando já resolvido", () => {
      const noteFolder = createFolder(t.ctx, { name: "Notas" });
      const taskFolder = createTaskFolder(t.ctx, { name: "Quadro" });
      const taskList = createTaskList(t.ctx, { folderId: taskFolder.id, name: "Lista" });

      const { item } = createInboxItem(t.ctx, { clientId: "mixed-1", content: "Item dúbio" });

      convertInboxToNote(t.ctx, item.id, noteFolder.id);
      expect(() => convertInboxToTask(t.ctx, item.id, taskList.id)).toThrowError(
        "Item já foi resolvido como nota",
      );

      const { item: item2 } = createInboxItem(t.ctx, { clientId: "mixed-2", content: "Item dúbio 2" });
      convertInboxToTask(t.ctx, item2.id, taskList.id);
      expect(() => convertInboxToNote(t.ctx, item2.id, noteFolder.id)).toThrowError(
        "Item já foi resolvido como tarefa",
      );
    });
  });
});
