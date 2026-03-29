import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlaylistDetailSliceContext } from "../context/musicDbSliceContexts";
import type { PlaylistDetailSliceValue, PlaylistTracksData } from "../types/musicDbSlices";
import PlaylistDetail from "./PlaylistDetail";

function buildPlaylistValue(overrides: Partial<PlaylistDetailSliceValue> = {}): PlaylistDetailSliceValue {
  return {
    playlistTracksLoading: false,
    playlistTracksData: null,
    deviceId: null,
    spotifyToken: null,
    playTrack: vi.fn(),
    ...overrides,
  };
}

function renderPlaylistDetail(overrides: Partial<PlaylistDetailSliceValue> = {}) {
  const value = buildPlaylistValue(overrides);
  render(
    <PlaylistDetailSliceContext.Provider value={value}>
      <PlaylistDetail />
    </PlaylistDetailSliceContext.Provider>,
  );
  return value;
}

describe("PlaylistDetail", () => {
  it("shows loading copy while playlist tracks are loading", () => {
    renderPlaylistDetail({ playlistTracksLoading: true, playlistTracksData: null });
    expect(screen.getByText("Loading playlist…")).toBeInTheDocument();
  });

  it("renders playlist name and meta when data is present", () => {
    const playlistTracksData: PlaylistTracksData = {
      name: "Road Trip",
      owner: "Alex",
      description: "Summer picks",
      tracks: [{ name: "One" }],
    };
    renderPlaylistDetail({ playlistTracksData });
    expect(screen.getByRole("heading", { level: 2, name: "Road Trip" })).toBeInTheDocument();
    expect(screen.getByText("Alex")).toBeInTheDocument();
    expect(screen.getByText("Summer picks")).toBeInTheDocument();
    const tracksLabel = screen.getByText("Tracks:");
    expect(tracksLabel.nextElementSibling).toHaveTextContent("1");
  });

  it("renders cover art when images include a url", () => {
    const playlistTracksData: PlaylistTracksData = {
      name: "P",
      images: [{ url: "https://i.scdn.co/image/abc" }],
    };
    renderPlaylistDetail({ playlistTracksData });
    const img = screen.getByRole("img", { name: "P" });
    expect(img).toHaveAttribute("src", "https://i.scdn.co/image/abc");
  });

  it("shows No Image placeholder when there are no images", () => {
    renderPlaylistDetail({
      playlistTracksData: { name: "Empty Art", tracks: [] },
    });
    expect(screen.getByText("No Image")).toBeInTheDocument();
  });

  it("lists tracks with position, title, artists, and album suffix", () => {
    const playlistTracksData: PlaylistTracksData = {
      name: "Mix",
      tracks: [
        {
          id: "t1",
          name: "Song A",
          uri: "spotify:track:a",
          artists: [{ name: "Artist One" }],
          album: "LP Title",
        },
        {
          id: "t2",
          name: "Song B",
          artists: [{ name: "A" }, { name: "B" }],
        },
      ],
    };
    renderPlaylistDetail({ playlistTracksData });
    expect(screen.getByRole("heading", { name: /playlist tracks/i })).toBeInTheDocument();
    expect(screen.getByText("Song A")).toBeInTheDocument();
    expect(screen.getByText(/Artist One/)).toBeInTheDocument();
    expect(screen.getByText(/• LP Title/)).toBeInTheDocument();
    expect(screen.getByText("Song B")).toBeInTheDocument();
    expect(screen.getByText("A, B")).toBeInTheDocument();
  });

  it("shows play buttons when uri, device, and Spotify token are present", () => {
    const playTrack = vi.fn();
    const playlistTracksData: PlaylistTracksData = {
      name: "P",
      tracks: [{ name: "Track", uri: "spotify:track:xyz" }],
    };
    renderPlaylistDetail({
      playlistTracksData,
      deviceId: "dev-1",
      spotifyToken: "sp",
      playTrack,
    });
    const playBtn = screen.getByTitle("Play Track");
    expect(playBtn).toBeInTheDocument();
    fireEvent.click(playBtn);
    expect(playTrack).toHaveBeenCalledWith("spotify:track:xyz");
  });

  it("hides play button without a track uri", () => {
    const playlistTracksData: PlaylistTracksData = {
      name: "P",
      tracks: [{ name: "No Uri" }],
    };
    renderPlaylistDetail({
      playlistTracksData,
      deviceId: "dev-1",
      spotifyToken: "sp",
    });
    expect(screen.queryByRole("button", { name: "▶" })).not.toBeInTheDocument();
  });

  it("hides play button without device id", () => {
    const playlistTracksData: PlaylistTracksData = {
      name: "P",
      tracks: [{ name: "T", uri: "spotify:track:x" }],
    };
    renderPlaylistDetail({
      playlistTracksData,
      deviceId: null,
      spotifyToken: "sp",
    });
    expect(screen.queryByTitle(/^Play /)).not.toBeInTheDocument();
  });

  it("hides play button without Spotify token", () => {
    const playlistTracksData: PlaylistTracksData = {
      name: "P",
      tracks: [{ name: "T", uri: "spotify:track:x" }],
    };
    renderPlaylistDetail({
      playlistTracksData,
      deviceId: "dev-1",
      spotifyToken: null,
    });
    expect(screen.queryByTitle(/^Play /)).not.toBeInTheDocument();
  });

  it("does not render tracklist section when tracks array is empty", () => {
    renderPlaylistDetail({
      playlistTracksData: { name: "Empty", tracks: [] },
    });
    expect(screen.queryByRole("heading", { name: /playlist tracks/i })).not.toBeInTheDocument();
  });
});
