import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "./LoginPage";

describe("LoginPage", () => {
  const realLocation = window.location;
  afterEach(() => {
    Object.defineProperty(window, "location", { value: realLocation, writable: true, configurable: true });
  });

  function mockLocation() {
    Object.defineProperty(window, "location", {
      value: { href: "http://localhost/" },
      writable: true,
      configurable: true,
    });
  }

  it("mostra só o botão de entrar com Google", () => {
    mockLocation();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <LoginPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: /entrar com google/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/senha/i)).not.toBeInTheDocument();
  });

  it("botão redireciona para o OAuth do servidor", () => {
    mockLocation();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <LoginPage />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /entrar com google/i }));
    expect(window.location.href).toBe("/api/auth/google");
  });

  it("explica quando o Google nega o login", () => {
    mockLocation();
    render(
      <MemoryRouter initialEntries={["/?auth=denied"]}>
        <LoginPage />
      </MemoryRouter>,
    );
    expect(screen.getByText("Login com Google foi cancelado.")).toBeInTheDocument();
  });
});
