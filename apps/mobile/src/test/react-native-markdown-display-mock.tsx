import React, { type ReactNode } from "react";

const Markdown = ({ children }: { children: string }) =>
  React.createElement("div", { "data-testid": "markdown" }, children);

export default Markdown;
export const MarkdownIt = () => ({ render: (s: string) => s });
