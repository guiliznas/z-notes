import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Modal } from "./Modal";

describe("Modal", () => {
  const setup = (size?: "md" | "lg") => {
    render(
      <Modal title="Título" onClose={vi.fn()} size={size} footer={<button type="button">Ok</button>}>
        <p>conteúdo</p>
      </Modal>,
    );
    const body = screen.getByText("conteúdo").parentElement!;
    return { body, card: body.parentElement!, overlay: body.parentElement!.parentElement! };
  };

  // jsdom não calcula layout: o teste trava as classes que limitam a altura e rolam o corpo.
  it("limita o card à altura da tela e rola só o corpo", () => {
    const { body, card, overlay } = setup();
    expect(overlay).toHaveClass("overflow-y-auto");
    expect(card).toHaveClass("flex", "flex-col", "max-h-[calc(100dvh-2rem)]");
    expect(body).toHaveClass("min-h-0", "overflow-y-auto");
    expect(screen.getByRole("heading", { name: "Título" }).parentElement).toHaveClass("shrink-0");
    expect(screen.getByRole("button", { name: "Ok" }).parentElement).toHaveClass("shrink-0");
  });

  it("aplica uma única largura máxima conforme o tamanho", () => {
    const { card } = setup("lg");
    expect(card).toHaveClass("max-w-lg");
    expect(card).not.toHaveClass("max-w-md");
  });
});
