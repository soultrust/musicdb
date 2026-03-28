import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UnmatchSpotifyConfirmModal from "./UnmatchSpotifyConfirmModal";

describe("UnmatchSpotifyConfirmModal", () => {
  it("renders track title and wires confirm and cancel", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <UnmatchSpotifyConfirmModal
        trackTitle="War Pigs"
        loading={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole("heading", { name: "Remove manual match?" })).toBeInTheDocument();
    expect(screen.getByText("War Pigs", { exact: false })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove match" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("shows loading state and disables actions", () => {
    render(
      <UnmatchSpotifyConfirmModal
        trackTitle="X"
        loading
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Removing…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
});
