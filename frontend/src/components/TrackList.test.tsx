import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  DetailShellSliceContext,
  DetailTracklistSliceContext,
} from "../context/musicDbSliceContexts";
import { buildDetailShellSliceValue, buildDetailTracklistSliceValue } from "../test/sliceFixtures";
import type { CatalogTrack } from "../types/musicDbSlices";
import type { DetailShellSliceValue, DetailTracklistSliceValue } from "../types/musicDbSlices";
import TrackList from "./TrackList";

function renderTrackList(
  {
    tracklist = [] as CatalogTrack[],
    shellOverrides = {},
    tracklistOverrides = {},
  }: {
    tracklist?: CatalogTrack[];
    shellOverrides?: Partial<DetailShellSliceValue>;
    tracklistOverrides?: Partial<DetailTracklistSliceValue>;
  } = {},
) {
  const tracklistCtx = buildDetailTracklistSliceValue(tracklistOverrides);
  const shellValue = buildDetailShellSliceValue({
    detailLoading: false,
    selectedItem: { id: "test-item", type: "release" },
    detailData: { tracklist },
    ...shellOverrides,
  });
  render(
    <DetailShellSliceContext.Provider value={shellValue}>
      <DetailTracklistSliceContext.Provider value={tracklistCtx}>
        <TrackList />
      </DetailTracklistSliceContext.Provider>
    </DetailShellSliceContext.Provider>,
  );
  return tracklistCtx;
}

describe("TrackList", () => {
  it("renders header and rows for each track", () => {
    renderTrackList({
      tracklist: [
        { title: "Alpha", position: "1." },
        { title: "Beta", position: "2." },
      ],
    });
    expect(screen.getByRole("heading", { name: /tracklist/i })).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("shows matching indicator when spotifyMatching is true", () => {
    renderTrackList({
      tracklist: [{ title: "A" }],
      tracklistOverrides: { spotifyMatching: true },
    });
    expect(screen.getByText(/matching to spotify/i)).toBeInTheDocument();
  });

  it("toggles autoplay via checkbox", () => {
    const setAutoplay = vi.fn();
    renderTrackList({
      tracklist: [{ title: "A" }],
      tracklistOverrides: { autoplay: false, setAutoplay },
    });
    const autoplay = screen.getByRole("switch", { name: /autoplay next track/i });
    fireEvent.click(autoplay);
    expect(setAutoplay).toHaveBeenCalledWith(true);
  });

  it("filter all shows every track", () => {
    const getDisplayLikeState = vi.fn((t) => t.state);
    renderTrackList({
      tracklist: [
        { title: "Unliked", state: 0 },
        { title: "Liked", state: 1 },
      ],
      tracklistOverrides: { tracklistFilter: null, getDisplayLikeState },
    });
    expect(screen.getByText("Unliked")).toBeInTheDocument();
    expect(screen.getByText("Liked")).toBeInTheDocument();
  });

  it("filter liked hides unliked tracks", () => {
    const getDisplayLikeState = vi.fn((t) => t.state);
    renderTrackList({
      tracklist: [
        { title: "Unliked", state: 0 },
        { title: "Liked", state: 1 },
      ],
      tracklistOverrides: { tracklistFilter: "liked", getDisplayLikeState },
    });
    expect(screen.queryByText("Unliked")).not.toBeInTheDocument();
    expect(screen.getByText("Liked")).toBeInTheDocument();
  });

  it("filter especially shows only especially liked", () => {
    const getDisplayLikeState = vi.fn((t) => t.state);
    renderTrackList({
      tracklist: [
        { title: "Liked", state: 1 },
        { title: "Especially", state: 2 },
      ],
      tracklistOverrides: { tracklistFilter: "especially", getDisplayLikeState },
    });
    expect(screen.queryByText("Liked")).not.toBeInTheDocument();
    expect(screen.getByText("Especially")).toBeInTheDocument();
  });

  it("Show all tracks calls setTracklistFilter(null)", () => {
    const setTracklistFilter = vi.fn();
    renderTrackList({
      tracklist: [{ title: "A" }],
      tracklistOverrides: { setTracklistFilter, tracklistFilter: "liked" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Show all tracks" }));
    expect(setTracklistFilter).toHaveBeenCalledWith(null);
  });

  it("liked filter toggle passes functional updater to setTracklistFilter", () => {
    const setTracklistFilter = vi.fn();
    renderTrackList({
      tracklist: [{ title: "A" }],
      tracklistOverrides: { setTracklistFilter, tracklistFilter: null },
    });
    fireEvent.click(screen.getByRole("button", { name: "Filter to liked" }));
    expect(setTracklistFilter).toHaveBeenCalled();
    const updater = setTracklistFilter.mock.calls[0][0];
    expect(typeof updater).toBe("function");
    expect(updater(null)).toBe("liked");
    expect(updater("liked")).toBe(null);
  });

  it("especially filter toggle passes functional updater to setTracklistFilter", () => {
    const setTracklistFilter = vi.fn();
    renderTrackList({
      tracklist: [{ title: "A" }],
      tracklistOverrides: { setTracklistFilter, tracklistFilter: null },
    });
    fireEvent.click(screen.getByRole("button", { name: "Filter to especially liked" }));
    expect(setTracklistFilter).toHaveBeenCalled();
    const updater = setTracklistFilter.mock.calls[0][0];
    expect(typeof updater).toBe("function");
    expect(updater(null)).toBe("especially");
    expect(updater("especially")).toBe(null);
  });

  it("especially filter star clears filter when already especially", () => {
    const setTracklistFilter = vi.fn();
    renderTrackList({
      tracklist: [{ title: "A" }],
      tracklistOverrides: { setTracklistFilter, tracklistFilter: "especially" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Show all" }));
    expect(setTracklistFilter).toHaveBeenCalled();
    const updater = setTracklistFilter.mock.calls[0][0];
    expect(updater("especially")).toBe(null);
  });

  it("unknown tracklistFilter falls through to showing all tracks", () => {
    const getDisplayLikeState = vi.fn((t) => t.state);
    renderTrackList({
      tracklist: [
        { title: "One", state: 0 },
        { title: "Two", state: 2 },
      ],
      tracklistOverrides: { tracklistFilter: "bogus", getDisplayLikeState },
    });
    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.getByText("Two")).toBeInTheDocument();
  });

  it("binds Spotify match by track title and passes play state to rows", () => {
    const handleTrackRowClick = vi.fn();
    const playTrack = vi.fn();
    renderTrackList({
      tracklist: [{ title: "Gamma", position: "1." }],
      tracklistOverrides: {
        spotifyMatches: [
          {
            catalog_title: "Gamma",
            spotify_track: { uri: "spotify:track:x", name: "Gamma", artists: [{ name: "Z" }] },
          },
        ],
        currentTrack: { uri: "spotify:track:x" },
        playbackDuration: 100,
        playbackPosition: 40,
        handleTrackRowClick,
        playTrack,
      },
    });
    const row = screen.getByRole("listitem");
    expect(within(row).getByRole("button", { name: /play/i })).toBeInTheDocument();
    fireEvent.click(within(row).getByRole("button", { name: /play/i }));
    expect(playTrack).toHaveBeenCalledWith("spotify:track:x");

    const bar = row.querySelector(".track-progress-bar");
    expect(bar).toHaveStyle({ width: `${40}%` });
  });

  it("uses manual match styling when manual_match and spotify track are set", () => {
    renderTrackList({
      tracklist: [{ title: "Gamma", position: "1." }],
      tracklistOverrides: {
        spotifyMatches: [
          {
            catalog_title: "Gamma",
            manual_match: true,
            spotify_track: {
              uri: "spotify:track:x",
              name: "Gamma",
              artists: [{ name: "Z" }],
            },
          },
        ],
      },
    });
    const row = screen.getByRole("listitem");
    expect(row.querySelector(".track-spotify-search-btn--manual")).toBeTruthy();
    expect(
      within(row).getByRole("button", { name: /remove manual spotify match/i }),
    ).toBeInTheDocument();
  });

  it("does not use manual styling for automatic Spotify match", () => {
    renderTrackList({
      tracklist: [{ title: "Gamma", position: "1." }],
      tracklistOverrides: {
        spotifyMatches: [
          {
            catalog_title: "Gamma",
            manual_match: false,
            spotify_track: {
              uri: "spotify:track:x",
              name: "Gamma",
              artists: [{ name: "Z" }],
            },
          },
        ],
      },
    });
    const row = screen.getByRole("listitem");
    expect(row.querySelector(".track-spotify-search-btn--manual")).toBeNull();
    expect(
      within(row).getByRole("button", { name: /manually find a matching track on spotify/i }),
    ).toBeInTheDocument();
  });

  it("resolves manual match via discogs_title when catalog_title absent", () => {
    renderTrackList({
      tracklist: [{ title: "Discogs Title", position: "1." }],
      tracklistOverrides: {
        spotifyMatches: [
          {
            discogs_title: "Discogs Title",
            manual_match: true,
            spotify_track: {
              uri: "spotify:track:y",
              name: "Y",
              artists: [{ name: "A" }],
            },
          },
        ],
      },
    });
    const row = screen.getByRole("listitem");
    expect(row.querySelector(".track-spotify-search-btn--manual")).toBeTruthy();
  });

  it("does not use manual styling when manual_match but no spotify track", () => {
    renderTrackList({
      tracklist: [{ title: "Gamma", position: "1." }],
      tracklistOverrides: {
        spotifyMatches: [
          {
            catalog_title: "Gamma",
            manual_match: true,
            spotify_track: null,
          },
        ],
      },
    });
    const row = screen.getByRole("listitem");
    expect(row.querySelector(".track-spotify-search-btn--manual")).toBeNull();
  });
});
