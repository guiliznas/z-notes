import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import SearchBar from "./SearchBar";

describe("SearchBar", () => {
  it("renderiza campo de busca com placeholder padrão", () => {
    const { getByPlaceholderText } = render(
      React.createElement(SearchBar, {
        value: "",
        onChangeText: () => {},
      }),
    );
    expect(getByPlaceholderText("Buscar notas...")).toBeTruthy();
  });

  it("chama onChangeText ao digitar", () => {
    const onChangeText = vi.fn();
    const { getByPlaceholderText } = render(
      React.createElement(SearchBar, {
        value: "",
        onChangeText,
      }),
    );

    fireEvent.change(getByPlaceholderText("Buscar notas..."), {
      target: { value: "Reunião" },
    });
    expect(onChangeText).toHaveBeenCalledWith("Reunião");
  });

  it("exibe botão de limpar quando há texto e limpa ao clicar", () => {
    const onChangeText = vi.fn();
    const onClear = vi.fn();
    const { getByLabelText } = render(
      React.createElement(SearchBar, {
        value: "Reunião",
        onChangeText,
        onClear,
      }),
    );

    const clearBtn = getByLabelText("Limpar busca");
    expect(clearBtn).toBeTruthy();

    fireEvent.click(clearBtn);
    expect(onChangeText).toHaveBeenCalledWith("");
    expect(onClear).toHaveBeenCalled();
  });
});
