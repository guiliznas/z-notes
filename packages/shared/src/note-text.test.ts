import { describe, it, expect } from "vitest";
import { deriveTitle, deriveExcerpt } from "./note-text.js";

describe("deriveTitle", () => {
  it("usa a primeira linha não vazia", () => {
    expect(deriveTitle("Comprar pão\nleite\novos")).toBe("Comprar pão");
  });

  it("ignora linhas em branco iniciais", () => {
    expect(deriveTitle("\n\n  Reunião\ncorpo")).toBe("Reunião");
  });

  it("remove marcador de heading markdown", () => {
    expect(deriveTitle("## Título\ntexto")).toBe("Título");
  });

  it("usa título padrão quando vazio", () => {
    expect(deriveTitle("")).toBe("Nova nota");
    expect(deriveTitle("   \n  ")).toBe("Nova nota");
  });
});

describe("deriveExcerpt", () => {
  it("pega o corpo após o título", () => {
    expect(deriveExcerpt("Título\nlinha um\nlinha dois")).toBe("linha um linha dois");
  });

  it("retorna vazio quando só há título", () => {
    expect(deriveExcerpt("Só o título")).toBe("");
  });

  it("trunca com reticências", () => {
    const long = "Título\n" + "a".repeat(200);
    const out = deriveExcerpt(long, 50);
    expect(out.endsWith("…")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(51);
  });
});
