import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockNavigate = vi.hoisted(() => vi.fn());
const mockInboxCount = vi.hoisted(() => ({ data: { count: 0 } }));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/hooks/useInbox", () => ({
  useInboxCount: () => mockInboxCount,
}));

import { SectionSwitch } from "./SectionSwitch";

describe("SectionSwitch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInboxCount.data = { count: 0 };
  });

  it("renderiza as 3 seções: Notas, Tarefas e Inbox", () => {
    render(<SectionSwitch current="notes" />);
    expect(screen.getByRole("button", { name: "Notas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tarefas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Inbox" })).toBeInTheDocument();
  });

  it("marca a seção ativa com aria-pressed=true", () => {
    render(<SectionSwitch current="inbox" />);
    expect(screen.getByRole("button", { name: "Inbox" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Notas" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Tarefas" })).toHaveAttribute("aria-pressed", "false");
  });

  it("navega para /inbox ao clicar em Inbox", () => {
    render(<SectionSwitch current="notes" />);
    fireEvent.click(screen.getByRole("button", { name: "Inbox" }));
    expect(mockNavigate).toHaveBeenCalledWith("/inbox");
  });

  it("navega para / ao clicar em Notas e para /tasks ao clicar em Tarefas", () => {
    render(<SectionSwitch current="inbox" />);
    fireEvent.click(screen.getByRole("button", { name: "Notas" }));
    expect(mockNavigate).toHaveBeenCalledWith("/");

    fireEvent.click(screen.getByRole("button", { name: "Tarefas" }));
    expect(mockNavigate).toHaveBeenCalledWith("/tasks");
  });

  it("exibe badge e acessibilidade com contagem pendente", () => {
    mockInboxCount.data = { count: 4 };
    render(<SectionSwitch current="notes" />);
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Inbox, 4 pendentes/ })).toBeInTheDocument();
  });
});
