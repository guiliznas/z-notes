import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SettingsModal } from "./SettingsModal";
import * as resources from "@/api/resources";

vi.mock("@/api/resources", async () => {
  const actual = await vi.importActual<typeof resources>("@/api/resources");
  return {
    ...actual,
    fetchApiTokens: vi.fn(),
    createApiToken: vi.fn(),
    revokeApiToken: vi.fn(),
  };
});

describe("Tokens de Captura na interface de Configurações", () => {
  let qc: QueryClient;

  beforeEach(() => {
    qc = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const renderModal = (open = true) => {
    return render(
      <QueryClientProvider client={qc}>
        <SettingsModal open={open} onClose={vi.fn()} />
      </QueryClientProvider>,
    );
  };

  it("permite alternar entre a aba Geral e Tokens de Captura", async () => {
    vi.mocked(resources.fetchApiTokens).mockResolvedValue([]);
    renderModal();

    expect(screen.getByText("URL do Servidor (API)")).toBeInTheDocument();

    const tokensTab = screen.getByRole("button", { name: "Tokens de Captura" });
    fireEvent.click(tokensTab);

    expect(screen.getByText("Tokens Pessoais de Captura")).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByText("Nenhum token criado ainda. Crie um token para capturar notas a partir de outros dispositivos ou apps."),
      ).toBeInTheDocument();
    });
  });

  it("lista tokens existentes com escopo, status e prefixo", async () => {
    vi.mocked(resources.fetchApiTokens).mockResolvedValue([
      {
        id: 1,
        name: "Atalhos iPhone",
        prefix: "znt_a1b2c3d4…",
        scope: "inbox:write",
        createdAt: Date.now() - 3600000,
        lastUsedAt: Date.now() - 60000,
        revokedAt: null,
        active: true,
      },
      {
        id: 2,
        name: "Bot Antigo",
        prefix: "znt_99887766…",
        scope: "inbox:write",
        createdAt: Date.now() - 86400000,
        lastUsedAt: null,
        revokedAt: Date.now() - 10000,
        active: false,
      },
    ]);

    renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Tokens de Captura" }));

    await waitFor(() => {
      expect(screen.getByText("Atalhos iPhone")).toBeInTheDocument();
      expect(screen.getByText("Bot Antigo")).toBeInTheDocument();
    });

    expect(screen.getByText("znt_a1b2c3d4…")).toBeInTheDocument();
    expect(screen.getByText("Ativo")).toBeInTheDocument();
    expect(screen.getAllByText("Revogado").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Revogar" })).toBeInTheDocument();
  });

  it("abre formulário, gera novo token e exibe o token em texto puro com aviso de cópia única", async () => {
    vi.mocked(resources.fetchApiTokens).mockResolvedValue([]);
    vi.mocked(resources.createApiToken).mockResolvedValue({
      id: 42,
      name: "Novo Atalho Siri",
      token: "znt_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      prefix: "znt_12345678…",
      scope: "inbox:write",
      createdAt: Date.now(),
    });

    renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Tokens de Captura" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "+ Novo Token" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "+ Novo Token" }));

    const input = screen.getByPlaceholderText("Ex.: Atalhos do iPhone, Tasker Android, Bot Telegram...");
    fireEvent.change(input, { target: { value: "Novo Atalho Siri" } });

    fireEvent.click(screen.getByRole("button", { name: "Gerar Token" }));

    await waitFor(() => {
      expect(screen.getByText(/Token "Novo Atalho Siri" gerado com sucesso!/)).toBeInTheDocument();
    });

    expect(screen.getByDisplayValue("znt_1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copiar Token" })).toBeInTheDocument();
  });

  it("revoga um token com diálogo de confirmação", async () => {
    vi.mocked(resources.fetchApiTokens).mockResolvedValue([
      {
        id: 7,
        name: "Token Para Excluir",
        prefix: "znt_11223344…",
        scope: "inbox:write",
        createdAt: Date.now(),
        lastUsedAt: null,
        revokedAt: null,
        active: true,
      },
    ]);
    vi.mocked(resources.revokeApiToken).mockResolvedValue({
      success: true,
      id: 7,
      revokedAt: Date.now(),
    });

    renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Tokens de Captura" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Revogar" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Revogar" }));

    expect(screen.getByText("Revogar Token de Captura")).toBeInTheDocument();
    expect(screen.getByText(/Tem certeza que deseja revogar o token "Token Para Excluir"\?/)).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: "Revogar Token" });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(resources.revokeApiToken).toHaveBeenCalledWith(7);
    });
  });

  it("exibe seção de documentação e exemplos para cURL e Atalhos do iOS", async () => {
    vi.mocked(resources.fetchApiTokens).mockResolvedValue([]);
    renderModal();
    fireEvent.click(screen.getByRole("button", { name: "Tokens de Captura" }));

    const docsToggle = screen.getByText(/Como configurar no iOS Atalhos/);
    fireEvent.click(docsToggle);

    expect(screen.getByText("Endpoint de Captura:")).toBeInTheDocument();
    expect(screen.getByText("Exemplo com cURL (Terminal):")).toBeInTheDocument();
    expect(screen.getByText("No Atalhos do iOS (Siri Shortcuts):")).toBeInTheDocument();
  });
});
