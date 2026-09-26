import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import MarkdownToolbar from "./MarkdownToolbar";

describe("MarkdownToolbar", () => {
  it("renderiza botões de atalhos markdown", () => {
    const { getByText } = render(
      React.createElement(MarkdownToolbar, { onInsert: () => {} }),
    );
    expect(getByText("H1")).toBeTruthy();
    expect(getByText("B")).toBeTruthy();
    expect(getByText("[ ]")).toBeTruthy();
    expect(getByText("•")).toBeTruthy();
  });

  it("chama onInsert com prefixo e sufixo corretos ao clicar", () => {
    const onInsert = vi.fn();
    const { getByText } = render(
      React.createElement(MarkdownToolbar, { onInsert }),
    );

    fireEvent.click(getByText("H1"));
    expect(onInsert).toHaveBeenCalledWith("# ", undefined);

    fireEvent.click(getByText("B"));
    expect(onInsert).toHaveBeenCalledWith("**", "**");

    fireEvent.click(getByText("[ ]"));
    expect(onInsert).toHaveBeenCalledWith("- [ ] ", undefined);
  });
});
