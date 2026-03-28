import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AuthGate, { type AuthMode } from "./AuthGate";

function renderAuthGate(overrides: Record<string, unknown> = {}) {
  const props = {
    authMode: "login" as AuthMode,
    authEmail: "user@example.com",
    authPassword: "secret",
    authLoading: false,
    authError: null,
    onSubmit: vi.fn((e) => e.preventDefault()),
    onChangeEmail: vi.fn(),
    onChangePassword: vi.fn(),
    onToggleAuthMode: vi.fn(),
    ...overrides,
  };
  render(<AuthGate {...props} />);
  return props;
}

describe("AuthGate", () => {
  it("renders login mode labels and controls", () => {
    renderAuthGate();
    expect(screen.getByRole("heading", { name: "MusicDB" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log in" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create an account" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByPlaceholderText("Password")).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
  });

  it("renders register mode copy and password autocomplete", () => {
    renderAuthGate({ authMode: "register" });
    expect(screen.getByRole("button", { name: "Register" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Already have an account? Log in" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toHaveAttribute("autocomplete", "new-password");
  });

  it("shows loading and disables inputs and submit", () => {
    renderAuthGate({ authLoading: true });
    expect(screen.getByRole("button", { name: "Please wait…" })).toBeDisabled();
    expect(screen.getByPlaceholderText("Email")).toBeDisabled();
    expect(screen.getByPlaceholderText("Password")).toBeDisabled();
  });

  it("wires submit and change handlers", () => {
    const props = renderAuthGate();
    fireEvent.change(screen.getByPlaceholderText("Email"), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Password"), {
      target: { value: "new-pass" },
    });
    const form = screen.getByRole("button", { name: "Log in" }).closest("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

    expect(props.onChangeEmail).toHaveBeenCalledTimes(1);
    expect(props.onChangePassword).toHaveBeenCalledTimes(1);
    expect(props.onSubmit).toHaveBeenCalledTimes(1);
  });

  it("renders backend error text when present", () => {
    renderAuthGate({ authError: "Invalid email or password" });
    expect(screen.getByText("Invalid email or password")).toBeInTheDocument();
  });

  it("calls toggle auth mode handler", () => {
    const props = renderAuthGate();
    fireEvent.click(screen.getByRole("button", { name: "Create an account" }));
    expect(props.onToggleAuthMode).toHaveBeenCalledTimes(1);
  });
});

