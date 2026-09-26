import { describe, it, expect } from "vitest";
import { toggleTaskListItem } from "./taskList";

describe("toggleTaskListItem", () => {
  it("marca item unchecked como checked", () => {
    const content = "- [ ] tarefa";
    expect(toggleTaskListItem(content, 0)).toBe("- [x] tarefa");
  });

  it("desmarca item checked como unchecked", () => {
    const content = "- [x] feito";
    expect(toggleTaskListItem(content, 0)).toBe("- [ ] feito");
  });

  it("preserva indentação", () => {
    const content = "  - [ ] aninhado";
    expect(toggleTaskListItem(content, 0)).toBe("  - [x] aninhado");
  });

  it("preserva texto após o marcador", () => {
    const content = "- [ ] comprar **pão** e leite";
    expect(toggleTaskListItem(content, 0)).toBe("- [x] comprar **pão** e leite");
  });

  it("seleciona o item correto por índice de linha", () => {
    const content = "- [ ] um\n- [ ] dois\n- [ ] três";
    expect(toggleTaskListItem(content, 1)).toBe("- [ ] um\n- [x] dois\n- [ ] três");
  });

  it("não altera linhas não-tarefa", () => {
    const content = "texto normal\n- [ ] tarefa\nmais texto";
    expect(toggleTaskListItem(content, 2)).toBe(content);
  });

  it("trata marcador * no lugar de -", () => {
    const content = "* [ ] tarefa";
    expect(toggleTaskListItem(content, 0)).toBe("* [x] tarefa");
  });

  it("retorna conteúdo original se linha for inexistente", () => {
    const content = "- [ ] tarefa";
    expect(toggleTaskListItem(content, 5)).toBe(content);
  });

  it("ignora linha que não casa o padrão mesmo com [ ]", () => {
    const content = "1. [ ] tarefa numerada";
    expect(toggleTaskListItem(content, 0)).toBe(content);
  });

  it("não confunde [ ] no meio de texto", () => {
    const content = "Ver [ ] documentação";
    expect(toggleTaskListItem(content, 0)).toBe(content);
  });
});
