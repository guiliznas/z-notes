import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  normalizeSharePayload,
  extractSharePayload,
  hasShareParams,
  savePendingShare,
  getPendingShare,
  clearPendingShare,
  PENDING_SHARE_KEY,
  PENDING_SHARE_EXPIRY_MS,
  type SharePayload,
} from "./shareTarget";

describe("normalizeSharePayload (testes de tabela com casos reais do Android)", () => {
  interface TestCase {
    name: string;
    payload: SharePayload;
    expected: string;
  }

  const testCases: TestCase[] = [
    {
      name: "Chrome Android - Compartilhar página web com título e URL",
      payload: {
        title: "Vite | Ferramenta Frontend de Próxima Geração",
        text: "",
        url: "https://vite.dev",
      },
      expected: "Vite | Ferramenta Frontend de Próxima Geração\nhttps://vite.dev",
    },
    {
      name: "Chrome Android - Título é idêntico à URL",
      payload: {
        title: "https://vite.dev",
        text: "",
        url: "https://vite.dev",
      },
      expected: "https://vite.dev",
    },
    {
      name: "YouTube Android - Vídeo com título, link no text e link no url",
      payload: {
        title: "Documentário sobre TypeScript",
        text: "https://youtu.be/dQw4w9WgXcQ",
        url: "https://youtu.be/dQw4w9WgXcQ",
      },
      expected: "Documentário sobre TypeScript\nhttps://youtu.be/dQw4w9WgXcQ",
    },
    {
      name: "YouTube Android - Texto já contém o título e o link",
      payload: {
        title: "TypeScript em 10 Minutos",
        text: "Assista 'TypeScript em 10 Minutos' no YouTube https://youtu.be/abc123xyz",
        url: "https://youtu.be/abc123xyz",
      },
      expected: "Assista 'TypeScript em 10 Minutos' no YouTube https://youtu.be/abc123xyz",
    },
    {
      name: "WhatsApp Android - Mensagem encaminhada de texto puro",
      payload: {
        title: "",
        text: "Comprar leite, café e pão na volta do trabalho.",
        url: "",
      },
      expected: "Comprar leite, café e pão na volta do trabalho.",
    },
    {
      name: "WhatsApp Android - Link enviado no texto sem parâmetro url",
      payload: {
        title: "",
        text: "Dá uma olhada nessa biblioteca: https://github.com/guiliznas/z-notes",
        url: "",
      },
      expected: "Dá uma olhada nessa biblioteca: https://github.com/guiliznas/z-notes",
    },
    {
      name: "App de Notas Android - Título e texto com múltiplas linhas",
      payload: {
        title: "Planejamento da Sprint",
        text: "- Revisar PR #30\n- Testar PWA no Android\n- Deploy Dokploy",
        url: "",
      },
      expected: "Planejamento da Sprint\n- Revisar PR #30\n- Testar PWA no Android\n- Deploy Dokploy",
    },
    {
      name: "App que repete o título exatamente igual ao texto",
      payload: {
        title: "Lembrete importante",
        text: "Lembrete importante",
        url: "",
      },
      expected: "Lembrete importante",
    },
    {
      name: "App completo enviando título, descrição e link externo",
      payload: {
        title: "Documentação do Web Share Target",
        text: "Especificação oficial da W3C para integração de compartilhamento em PWAs",
        url: "https://w3c.github.io/web-share-target/",
      },
      expected:
        "Documentação do Web Share Target\nEspecificação oficial da W3C para integração de compartilhamento em PWAs\nhttps://w3c.github.io/web-share-target/",
    },
    {
      name: "Apenas URL fornecida",
      payload: {
        title: null,
        text: undefined,
        url: "https://notes.o.ziltro.dev",
      },
      expected: "https://notes.o.ziltro.dev",
    },
    {
      name: "Apenas Título fornecido",
      payload: {
        title: "Ideia rápida de produto",
        text: "",
        url: "",
      },
      expected: "Ideia rápida de produto",
    },
    {
      name: "Campos vazios ou só espaços em branco",
      payload: {
        title: "   ",
        text: " \n\t ",
        url: "",
      },
      expected: "",
    },
  ];

  testCases.forEach(({ name, payload, expected }) => {
    it(name, () => {
      expect(normalizeSharePayload(payload)).toBe(expected);
    });
  });
});

describe("extractSharePayload e hasShareParams", () => {
  it("extrai parâmetros de string de busca", () => {
    const search = "?title=Meu%20Titulo&text=Meu%20Texto&url=https%3A%2F%2Fexample.com";
    const payload = extractSharePayload(search);
    expect(payload).toEqual({
      title: "Meu Titulo",
      text: "Meu Texto",
      url: "https://example.com",
    });
    expect(hasShareParams(search)).toBe(true);
  });

  it("retorna false se a busca não tiver parâmetros válidos", () => {
    expect(hasShareParams("")).toBe(false);
    expect(hasShareParams("?outro=123")).toBe(false);
    expect(hasShareParams("?title=&text=  ")).toBe(false);
  });
});

describe("Armazenamento de compartilhamento pendente (savePendingShare / getPendingShare / clearPendingShare)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("salva e recupera conteúdo compartilhado dentro do prazo de validade", () => {
    savePendingShare("Texto importante vindo do Chrome");
    const pending = getPendingShare();

    expect(pending).not.toBeNull();
    expect(pending?.content).toBe("Texto importante vindo do Chrome");
    expect(pending?.source).toBe("share");
    expect(typeof pending?.savedAt).toBe("number");
  });

  it("ignora salvamento de texto vazio", () => {
    savePendingShare("   ");
    expect(localStorage.getItem(PENDING_SHARE_KEY)).toBeNull();
    expect(getPendingShare()).toBeNull();
  });

  it("limpa compartilhamento com clearPendingShare", () => {
    savePendingShare("Conteúdo a ser limpo");
    expect(getPendingShare()).not.toBeNull();

    clearPendingShare();
    expect(getPendingShare()).toBeNull();
  });

  it("descarta e remove compartilhamento expirado (> 15 minutos)", () => {
    const agora = Date.now();
    const expiradoTimestamp = agora - (PENDING_SHARE_EXPIRY_MS + 1000);

    localStorage.setItem(
      PENDING_SHARE_KEY,
      JSON.stringify({
        content: "Conteúdo antigo",
        source: "share",
        savedAt: expiradoTimestamp,
      })
    );

    const pending = getPendingShare();
    expect(pending).toBeNull();
    expect(localStorage.getItem(PENDING_SHARE_KEY)).toBeNull();
  });
});
