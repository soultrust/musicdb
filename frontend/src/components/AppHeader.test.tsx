import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HeaderSliceContext } from "../context/musicDbSliceContexts";
import { fakeSelectChange } from "../test/helpers";
import { buildHeaderSliceValue } from "../test/sliceFixtures";
import type { HeaderSliceValue } from "../types/musicDbSlices";
import AppHeader from "./AppHeader";

function renderAppHeader(overrides: Partial<HeaderSliceValue> = {}) {
  const value = buildHeaderSliceValue(overrides);
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
      <HeaderSliceContext.Provider value={buildHeaderSliceValue({ spotifyToken: "sp" })}>
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

  it("does not show a device switcher when no devices are known", () => {
    renderAppHeader({ spotifyToken: "sp", spotifyDevices: [] });
    expect(screen.queryByTitle("Switch playback device")).not.toBeInTheDocument();
  });

  it("shows a device switcher to the left of the status when devices are available", () => {
    renderAppHeader({
      spotifyToken: "sp",
      spotifyConnectionStatus: "connected",
      deviceId: "d1",
      spotifyDevices: [
        { id: "d1", name: "This Browser", type: "Computer", is_active: true },
        { id: "d2", name: "Kitchen Speaker", type: "Speaker", is_active: false },
      ],
      activeSpotifyDeviceId: "d1",
    });
    const select = screen.getByTitle("Switch playback device") as HTMLSelectElement;
    expect(select.value).toBe("d1");
    expect(screen.getByRole("option", { name: "This Browser" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Kitchen Speaker (Speaker)" })).toBeInTheDocument();

    const controls = select.closest(".spotify-controls");
    expect(controls?.firstElementChild).toBe(select);
  });

  it("calls switchSpotifyDevice when a different device is selected", () => {
    const switchSpotifyDevice = vi.fn();
    renderAppHeader({
      spotifyToken: "sp",
      spotifyDevices: [
        { id: "d1", name: "This Browser", type: "Computer", is_active: true },
        { id: "d2", name: "Kitchen Speaker", type: "Speaker", is_active: false },
      ],
      activeSpotifyDeviceId: "d1",
      switchSpotifyDevice,
    });
    const select = screen.getByTitle("Switch playback device");
    fireEvent.change(select, fakeSelectChange("d2"));
    expect(switchSpotifyDevice).toHaveBeenCalledWith("d2");
  });

  it("refreshes devices when the switcher gains focus", () => {
    const refreshSpotifyDevices = vi.fn();
    renderAppHeader({
      spotifyToken: "sp",
      spotifyDevices: [{ id: "d1", name: "This Browser", type: "Computer", is_active: true }],
      activeSpotifyDeviceId: "d1",
      refreshSpotifyDevices,
    });
    fireEvent.focus(screen.getByTitle("Switch playback device"));
    expect(refreshSpotifyDevices).toHaveBeenCalledTimes(1);
  });
});
