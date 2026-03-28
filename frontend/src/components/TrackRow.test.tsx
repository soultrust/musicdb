import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TrackRow, { type TrackRowProps } from "./TrackRow";

function buildTrack(overrides: Partial<TrackRowProps["track"]> = {}) {
  return { title: "Test Track", position: "1.", duration: "3:45", ...overrides };
}

function buildSpotifyTrack(overrides: Record<string, unknown> = {}) {
  return {
    uri: "spotify:track:abc",
    name: "Test Track",
    artists: [{ name: "Artist One" }],
    ...overrides,
  };
}

function renderTrackRow(overrides: Partial<TrackRowProps> = {}) {
  const track = overrides.track ?? buildTrack();
  const props: TrackRowProps = {
    index: 0,
    spotifyTrack: null,
    matchExists: false,
    isActive: false,
    progress: 0,
    likeState: 0,
    matchedDisconnected: false,
    getTrackKey: (t) => t.title,
    handleTrackRowClick: vi.fn(),
    playTrack: vi.fn(),
    onSpotifySearchClick: vi.fn(),
    toggleLikeTrack: vi.fn(),
    ...overrides,
    track,
  };
  return render(<TrackRow {...props} />);
}

describe("TrackRow", () => {
  it("renders position, title, and duration", () => {
    renderTrackRow({
      track: buildTrack({ position: "2.", title: "Side B", duration: "4:00" }),
      index: 1,
    });
    expect(screen.getByText("2.")).toBeInTheDocument();
    expect(screen.getByText("Side B")).toBeInTheDocument();
    expect(screen.getByText("4:00")).toBeInTheDocument();
  });

  it("falls back position from index when track has no position", () => {
    renderTrackRow({ track: buildTrack({ position: undefined }), index: 2 });
    expect(screen.getByText("3.")).toBeInTheDocument();
  });

  it("renders Matching… when no spotify match row exists yet", () => {
    renderTrackRow({ matchExists: false, spotifyTrack: null });
    expect(screen.getByText("Matching…")).toBeInTheDocument();
  });

  it("renders No match when a match row exists but spotify track is missing", () => {
    renderTrackRow({ matchExists: true, spotifyTrack: null });
    expect(screen.getByText("No match")).toBeInTheDocument();
  });

  it("plays via Spotify URI and disables play when matched but disconnected", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const playTrack = vi.fn();
    renderTrackRow({
      spotifyTrack: buildSpotifyTrack(),
      matchExists: true,
      playTrack,
    });
    const playBtn = screen.getByRole("button", { name: /play/i });
    expect(playBtn).not.toBeDisabled();
    fireEvent.click(playBtn);
    expect(playTrack).toHaveBeenCalledWith("spotify:track:abc");
    expect(logSpy).toHaveBeenCalled();

    logSpy.mockRestore();
  });

  it("disables play when matchedDisconnected", () => {
    renderTrackRow({
      spotifyTrack: buildSpotifyTrack(),
      matchExists: true,
      matchedDisconnected: true,
    });
    expect(screen.getByRole("button", { name: /play/i })).toBeDisabled();
  });

  it("calls onSpotifySearchClick with track title without bubbling to row", () => {
    const onSpotifySearchClick = vi.fn();
    const handleTrackRowClick = vi.fn();
    renderTrackRow({
      track: buildTrack({ title: "Find Me" }),
      onSpotifySearchClick,
      handleTrackRowClick,
    });
    fireEvent.click(screen.getByRole("button", { name: /manually find a matching track/i }));
    expect(onSpotifySearchClick).toHaveBeenCalledWith("Find Me");
    expect(handleTrackRowClick).not.toHaveBeenCalled();
  });

  it("uses green search button and remove-match label when manualSpotifyMatch", () => {
    const { container } = render(
      <TrackRow
        track={buildTrack()}
        index={0}
        spotifyTrack={buildSpotifyTrack()}
        matchExists
        manualSpotifyMatch
        isActive={false}
        progress={0}
        likeState={0}
        matchedDisconnected={false}
        getTrackKey={(t) => t.title}
        handleTrackRowClick={vi.fn()}
        playTrack={vi.fn()}
        onSpotifySearchClick={vi.fn()}
        toggleLikeTrack={vi.fn()}
      />,
    );
    expect(container.querySelector(".track-spotify-search-btn--manual")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /remove manual spotify match/i }),
    ).toBeInTheDocument();
  });

  it("like button toggles like when connected", () => {
    const toggleLikeTrack = vi.fn();
    renderTrackRow({
      track: buildTrack(),
      toggleLikeTrack,
      matchedDisconnected: false,
    });
    fireEvent.click(screen.getByRole("button", { name: /like track/i }));
    expect(toggleLikeTrack).toHaveBeenCalled();
  });

  it("like button does not toggle when disconnected", () => {
    const toggleLikeTrack = vi.fn();
    renderTrackRow({
      track: buildTrack(),
      toggleLikeTrack,
      matchedDisconnected: true,
    });
    fireEvent.click(screen.getByRole("button", { name: /like track/i }));
    expect(toggleLikeTrack).not.toHaveBeenCalled();
  });

  it("shows progress bar width when active", () => {
    const { container } = renderTrackRow({
      isActive: true,
      progress: 50,
      spotifyTrack: buildSpotifyTrack(),
      matchExists: true,
    });
    const bar = container.querySelector(".track-progress-bar");
    expect(bar).toHaveStyle({ width: "50%" });
  });

  it("applies track-playing class when active", () => {
    const { container } = renderTrackRow({
      isActive: true,
      progress: 10,
      spotifyTrack: buildSpotifyTrack(),
      matchExists: true,
    });
    expect(container.querySelector(".track-playing")).toBeTruthy();
  });

  it("clicking row calls handleTrackRowClick", () => {
    const handleTrackRowClick = vi.fn();
    const { container } = renderTrackRow({
      handleTrackRowClick,
      isActive: false,
      spotifyTrack: buildSpotifyTrack(),
      matchExists: true,
    });
    fireEvent.click(container.querySelector("li")!);
    expect(handleTrackRowClick).toHaveBeenCalled();
  });

  it("star button labels reflect likeState", () => {
    renderTrackRow({ likeState: 1, spotifyTrack: buildSpotifyTrack(), matchExists: true });
    expect(screen.getByRole("button", { name: /^liked$/i })).toBeInTheDocument();
  });
});
