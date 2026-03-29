import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HeaderSliceContext } from "../context/musicDbSliceContexts";
import { fakeSelectChange } from "../test/helpers";
import type { HeaderSliceValue } from "../types/musicDbSlices";
import AppHeader from "./AppHeader";

function buildHeaderValue(overrides: Partial<HeaderSliceValue> = {}): HeaderSliceValue {
  return {
    spotifyToken: null,
    spotifyConnectionStatus: "disconnected",
    deviceId: null,
    isPlaying: false,
    currentTrack: null,
    togglePlayback: vi.fn(),
    handleSpotifyLogin: vi.fn(),
    viewListId: null,
    onViewListChange: vi.fn(),
    allListsForView: [],
    logout: vi.fn(),
    ...overrides,
  };
}

function renderAppHeader(overrides: Partial<HeaderSliceValue> = {}) {
  const value = buildHeaderValue(overrides);
  render(
    <HeaderSliceContext.Provider value={value}>
      <AppHeader />
    </HeaderSliceContext.Provider>,
  );
  return value;
}

describe("AppHeader", () => {
  it("renders app title and MusicBrainz subtitle", () => {
    renderAppHeader();
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("MusicDB");
    expect(within(heading).getByText("MusicBrainz")).toBeInTheDocument();
  });

  it("shows Connect to Spotify when no token", () => {
    renderAppHeader({ spotifyToken: null });
    expect(screen.getByRole("button", { name: /connect to spotify/i })).toBeInTheDocument();
    expect(screen.queryByText(/spotify connected/i)).not.toBeInTheDocument();
  });

  it("calls handleSpotifyLogin when Connect is clicked", () => {
    const handleSpotifyLogin = vi.fn();
    renderAppHeader({ handleSpotifyLogin });
    fireEvent.click(screen.getByRole("button", { name: /connect to spotify/i }));
    expect(handleSpotifyLogin).toHaveBeenCalledTimes(1);
  });

  it("shows Spotify Connected and play control when connected with a device", () => {
    renderAppHeader({
      spotifyToken: "sp",
      spotifyConnectionStatus: "connected",
      deviceId: "dev-1",
      currentTrack: { uri: "spotify:track:1" },
    });
    expect(screen.getByText("Spotify Connected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "▶" })).toBeInTheDocument();
  });

  it("shows pause icon when playing", () => {
    renderAppHeader({
      spotifyToken: "sp",
      spotifyConnectionStatus: "connected",
      deviceId: "dev-1",
      currentTrack: { uri: "spotify:track:1" },
      isPlaying: true,
    });
    expect(screen.getByRole("button", { name: "⏸" })).toBeInTheDocument();
  });

  it("disables play when there is no current track", () => {
    renderAppHeader({
      spotifyToken: "sp",
      spotifyConnectionStatus: "connected",
      deviceId: "dev-1",
      currentTrack: null,
    });
    expect(screen.getByRole("button", { name: "▶" })).toBeDisabled();
  });

  it("shows connecting copy while Spotify is connecting", () => {
    renderAppHeader({
      spotifyToken: "sp",
      spotifyConnectionStatus: "connecting",
      deviceId: null,
    });
    expect(screen.getByText("Spotify Connecting...")).toBeInTheDocument();
  });

  it("shows reconnecting copy when token exists but not connected", () => {
    renderAppHeader({
      spotifyToken: "sp",
      spotifyConnectionStatus: "disconnected",
      deviceId: null,
    });
    expect(screen.getByText("Spotify Reconnecting...")).toBeInTheDocument();
  });

  it("adds Shared Playlists option when Spotify is linked", () => {
    const { container } = render(
      <HeaderSliceContext.Provider value={buildHeaderValue({ spotifyToken: "sp" })}>
        <AppHeader />
      </HeaderSliceContext.Provider>,
    );
    const select = container.querySelector("select.view-list-select");
    expect(select).not.toBeNull();
    expect(screen.getByRole("option", { name: "Shared Playlists" })).toHaveValue("spotify-playlists");
  });

  it("groups library lists by type in the select", () => {
    renderAppHeader({
      allListsForView: [
        { id: 1, name: "My Releases", list_type: "release" },
        { id: 2, name: "Favorite Artists", list_type: "person" },
      ],
    });
    expect(screen.getByRole("option", { name: "My Releases" })).toHaveValue("1");
    expect(screen.getByRole("option", { name: "Favorite Artists" })).toHaveValue("2");
  });

  it("reflects viewListId on the select when that list exists", () => {
    renderAppHeader({
      viewListId: 42,
      allListsForView: [{ id: 42, name: "Active List", list_type: "release" }],
    });
    const select = screen.getByTitle("Select a list to view") as HTMLSelectElement;
    expect(select.value).toBe("42");
  });

  it("calls onViewListChange when selection changes", () => {
    const onViewListChange = vi.fn();
    renderAppHeader({ onViewListChange });
    const select = screen.getByTitle("Select a list to view");
    fireEvent.change(select, fakeSelectChange("7"));
    expect(onViewListChange).toHaveBeenCalledTimes(1);
  });

  it("calls logout from the header", () => {
    const logout = vi.fn();
    renderAppHeader({ logout });
    fireEvent.click(screen.getByRole("button", { name: /log out/i }));
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
