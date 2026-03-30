import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SpotifySearchModalSliceContext } from "../context/musicDbSliceContexts";
import { buildSpotifySearchModalSliceValue } from "../test/sliceFixtures";
import type { SpotifySearchModalSliceValue } from "../types/musicDbSlices";
import SpotifySearchModal from "./SpotifySearchModal";

function renderSpotifySearchModal(overrides: Partial<SpotifySearchModalSliceValue> = {}) {
  const value = buildSpotifySearchModalSliceValue(overrides);
  render(
    <SpotifySearchModalSliceContext.Provider value={value}>
      <SpotifySearchModal />
    </SpotifySearchModalSliceContext.Provider>,
  );
  return value;
}

describe("SpotifySearchModal", () => {
  it("renders title and hint copy", () => {
    renderSpotifySearchModal();
    expect(screen.getByRole("heading", { name: /search track on spotify/i })).toBeInTheDocument();
    expect(screen.getByText(/fields are pre-filled from the release/i)).toBeInTheDocument();
  });

  it("wires track, artist, and album inputs to setters", () => {
    const setSpotifySearchQuery = vi.fn();
    const setSpotifySearchArtist = vi.fn();
    const setSpotifySearchAlbum = vi.fn();
    renderSpotifySearchModal({
      spotifySearchQuery: "a",
      spotifySearchArtist: "b",
      spotifySearchAlbum: "c",
      setSpotifySearchQuery,
      setSpotifySearchArtist,
      setSpotifySearchAlbum,
    });

    fireEvent.change(screen.getByLabelText(/^track title$/i), { target: { value: "T" } });
    fireEvent.change(screen.getByLabelText(/^artist$/i), { target: { value: "Art" } });
    fireEvent.change(screen.getByLabelText(/^album$/i), { target: { value: "Alb" } });
    expect(setSpotifySearchQuery).toHaveBeenCalledWith("T");
    expect(setSpotifySearchArtist).toHaveBeenCalledWith("Art");
    expect(setSpotifySearchAlbum).toHaveBeenCalledWith("Alb");
  });

  it("submits search via handleSpotifySearch", () => {
    const handleSpotifySearch = vi.fn();
    renderSpotifySearchModal({
      spotifySearchQuery: "War Pigs",
      handleSpotifySearch,
    });
    const form = document.querySelector("form.spotify-search-form");
    fireEvent.submit(form!);
    expect(handleSpotifySearch).toHaveBeenCalled();
  });

  it("disables Search when query is blank", () => {
    renderSpotifySearchModal({ spotifySearchQuery: "   " });
    expect(screen.getByRole("button", { name: "Search" })).toBeDisabled();
  });

  it("disables Search while loading", () => {
    renderSpotifySearchModal({ spotifySearchQuery: "Ok", spotifySearchLoading: true });
    expect(screen.getByRole("button", { name: "Searching…" })).toBeDisabled();
  });

  it("shows Searching… on submit button while loading", () => {
    renderSpotifySearchModal({ spotifySearchQuery: "q", spotifySearchLoading: true });
    expect(screen.getByRole("button", { name: "Searching…" })).toBeInTheDocument();
  });

  it("renders results and calls handleSelectSpotifyTrack", () => {
    const handleSelectSpotifyTrack = vi.fn();
    renderSpotifySearchModal({
      spotifySearchQuery: "x",
      spotifySearchResults: [
        {
          id: "t1",
          uri: "spotify:track:1",
          name: "Track One",
          artists: [{ name: "A1" }],
          album: { name: "LP" },
        },
      ],
      handleSelectSpotifyTrack,
    });
    expect(screen.getByText("Track One")).toBeInTheDocument();
    expect(screen.getByText("A1")).toBeInTheDocument();
    expect(screen.getByText("LP")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Select" }));
    expect(handleSelectSpotifyTrack).toHaveBeenCalledWith(
      expect.objectContaining({ id: "t1", name: "Track One" }),
    );
  });

  it("shows empty state after fetch with no results", () => {
    renderSpotifySearchModal({
      spotifySearchQuery: "q",
      spotifySearchFetched: true,
      spotifySearchLoading: false,
      spotifySearchResults: [],
    });
    expect(screen.getByText(/no results\. try a different search/i)).toBeInTheDocument();
  });

  it("closes via overlay, header close, and stopPropagation on content", () => {
    const closeSpotifySearchModal = vi.fn();
    renderSpotifySearchModal({ closeSpotifySearchModal });

    fireEvent.click(document.querySelector(".modal-overlay")!);
    expect(closeSpotifySearchModal).toHaveBeenCalledTimes(1);

    closeSpotifySearchModal.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(closeSpotifySearchModal).toHaveBeenCalledTimes(1);

    closeSpotifySearchModal.mockClear();
    fireEvent.click(screen.getByRole("heading", { name: /search track on spotify/i }));
    expect(closeSpotifySearchModal).not.toHaveBeenCalled();
  });
});
