import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import FolderModal from "./FolderModal";

describe("FolderModal", () => {
  it("renderiza corretamente para nova pasta", () => {
    const { getByText, getByPlaceholderText } = render(
      React.createElement(FolderModal, {
        visible: true,
        onSave: () => {},
        onClose: () => {},
      }),
    );
    expect(getByText("Nova Pasta")).toBeTruthy();
    expect(getByPlaceholderText("Nome da pasta")).toBeTruthy();
  });

  it("mostra nome do pai quando parentName é fornecido", () => {
    const { getByText } = render(
      React.createElement(FolderModal, {
        visible: true,
        parentName: "Projetos",
        onSave: () => {},
        onClose: () => {},
      }),
    );
    expect(getByText('Nova Subpasta em "Projetos"')).toBeTruthy();
  });

  it("chama onSave com o nome digitado", () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const { getByPlaceholderText, getByText } = render(
      React.createElement(FolderModal, {
        visible: true,
        onSave,
        onClose,
      }),
    );

    fireEvent.change(getByPlaceholderText("Nome da pasta"), {
      target: { value: "Trabalho" },
    });
    fireEvent.click(getByText("Salvar"));

    expect(onSave).toHaveBeenCalledWith("Trabalho");
    expect(onClose).toHaveBeenCalled();
  });

  it("não chama onSave se o nome for vazio", () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    const { getByText } = render(
      React.createElement(FolderModal, {
        visible: true,
        onSave,
        onClose,
      }),
    );

    fireEvent.click(getByText("Salvar"));
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("chama onClose ao clicar em Cancelar", () => {
    const onClose = vi.fn();
    const { getByText } = render(
      React.createElement(FolderModal, {
        visible: true,
        onSave: () => {},
        onClose,
      }),
    );

    fireEvent.click(getByText("Cancelar"));
    expect(onClose).toHaveBeenCalled();
  });
});
