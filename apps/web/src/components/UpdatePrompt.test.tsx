import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UpdatePrompt } from "./UpdatePrompt";
import { useRegisterSW } from "virtual:pwa-register/react";

describe("UpdatePrompt", () => {
  it("não renderiza nada sem atualização pendente", () => {
    vi.mocked(useRegisterSW).mockReturnValue({
      needRefresh: [false, vi.fn()],
      offlineReady: [false, vi.fn()],
      updateServiceWorker: vi.fn(),
    });
    const { container } = render(<UpdatePrompt />);
    expect(container).toBeEmptyDOMElement();
  });

  it("oferece atualizar e dispensa", () => {
    const updateServiceWorker = vi.fn();
    const setNeedRefresh = vi.fn();
    vi.mocked(useRegisterSW).mockReturnValue({
      needRefresh: [true, setNeedRefresh],
      offlineReady: [false, vi.fn()],
      updateServiceWorker,
    });
    render(<UpdatePrompt />);
    expect(screen.getByRole("alert")).toHaveTextContent("Nova versão disponível.");
    fireEvent.click(screen.getByRole("button", { name: "Atualizar" }));
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: "Depois" }));
    expect(setNeedRefresh).toHaveBeenCalledWith(false);
  });
});
