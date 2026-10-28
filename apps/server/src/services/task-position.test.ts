import { describe, it, expect } from "vitest";
import { endPosition, placeAfter, POSITION_STEP, type Sibling } from "./task-position.js";

const seq = (...positions: number[]): Sibling[] => positions.map((position, i) => ({ id: i + 1, position }));

describe("endPosition", () => {
  it("lista vazia começa no primeiro passo", () => {
    expect(endPosition([])).toBe(POSITION_STEP);
  });
  it("vai um passo além da maior posição", () => {
    expect(endPosition(seq(1024, 4096, 2048))).toBe(4096 + POSITION_STEP);
  });
});

describe("placeAfter", () => {
  it("null coloca antes de todos", () => {
    expect(placeAfter(seq(1024, 2048), null)?.position).toBe(1024 - POSITION_STEP);
  });
  it("null em lista vazia usa o primeiro passo", () => {
    expect(placeAfter([], null)?.position).toBe(POSITION_STEP);
  });
  it("depois do último vai para o fim", () => {
    expect(placeAfter(seq(1024, 2048), 2)?.position).toBe(2048 + POSITION_STEP);
  });
  it("entre dois vizinhos usa o ponto médio, sem renumerar", () => {
    const p = placeAfter(seq(1024, 2048, 3072), 1)!;
    expect(p.position).toBe(1536);
    expect(p.renumber).toBeUndefined();
  });
  it("afterId inexistente devolve null", () => {
    expect(placeAfter(seq(1024), 99)).toBeNull();
  });
  it("vizinhos colados renumeram e a nova posição fica entre os dois", () => {
    const siblings: Sibling[] = [
      { id: 1, position: 1 },
      { id: 2, position: 1 + 1e-9 },
      { id: 3, position: 5 },
    ];
    const p = placeAfter(siblings, 1)!;
    expect(p.renumber).toBeDefined();
    const pos1 = p.renumber!.get(1)!;
    const pos2 = p.renumber!.get(2)!;
    expect(pos1).toBeLessThan(p.position);
    expect(p.position).toBeLessThan(pos2);
  });
  it("mover repetidamente para o mesmo vão nunca quebra a ordem", () => {
    let siblings: Sibling[] = seq(1024, 2048);
    for (let i = 0; i < 80; i++) {
      const p = placeAfter(siblings, 1)!;
      const base = p.renumber
        ? siblings.map((s) => ({ ...s, position: p.renumber!.get(s.id)! }))
        : siblings;
      const next: Sibling = { id: 100 + i, position: p.position };
      siblings = [base[0], next, ...base.slice(1)];
      const positions = siblings.map((s) => s.position);
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
      expect(new Set(positions).size).toBe(positions.length);
    }
  });
});
