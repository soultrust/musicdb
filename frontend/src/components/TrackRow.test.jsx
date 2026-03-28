import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import TrackRow from "./TrackRow";

function buildTrack(overrides = {}) {
  return { title: "Test Track", position: "1.", duration: "3:45", ...overrides };
}

function buildSpotifyTrack(overrides = {}) {
  return {
    uri: "spotify:track:abc",
    name: "Test Track",
    artists: [{ name: "Artist One" }],
    ...overrides,
  };
}

function renderTrackRow(overrides = {}) {
  const track = overrides.track ?? buildTrack();
  const props = {
    track,
    index: overrides.index ?? 0,
    spotifyTrack: overrides.spotifyTrack ?? null,
    matchExists: overrides.matchExists ?? false,
    isActive: overrides.isActive ?? false,
    progress: overrides.progress ?? 0,
    likeState: overrides.likeState ?? 0,
    matchedDisconnected: overrides.matchedDisconnected ?? false,
    getTrackKey: overrides.getTrackKey ?? ((t) => t.title),
    handleTrackRowClick: overrides.handleTrackRowClick ?? vi.fn(),
    playTrack: overrides.playTrack ?? vi.fn(),
    openSpotifySearchModal: overrides.openSpotifySearchModal ?? vi.fn(),
    toggleLikeTrack: overrides.toggleLikeTrack ?? vi.fn(),
    ...overrides,
  };
  delete props.track;
  render(<TrackRow track={track} {...props} />);
  return props;
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

  it("opens Spotify search modal with track title without bubbling to row", () => {
    const openSpotifySearchModal = vi.fn();
    const handleTrackRowClick = vi.fn();
    renderTrackRow({
      track: buildTrack({ title: "Find Me" }),
      openSpotifySearchModal,
      handleTrackRowClick,
    });
    fireEvent.click(screen.getByRole("button", { name: /manually find a matching track/i }));
    expect(openSpotifySearchModal).toHaveBeenCalledWith("Find Me");
    expect(handleTrackRowClick).not.toHaveBeenCalled();
  });

  it("toggles like when connected and stops propagation", () => {
    const toggleLikeTrack = vi.fn();
    const handleTrackRowClick = vi.fn();
    const track = buildTrack();
    renderTrackRow({ track, toggleLikeTrack, handleTrackRowClick, likeState: 1 });
    const row = screen.getByRole("listitem");
    fireEvent.click(within(row).getByRole("button", { name: "Liked" }));
    expect(toggleLikeTrack).toHaveBeenCalledWith(track);
    expect(handleTrackRowClick).not.toHaveBeenCalled();
  });

  it("does not toggle like when matchedDisconnected", () => {
    const toggleLikeTrack = vi.fn();
    renderTrackRow({
      spotifyTrack: buildSpotifyTrack(),
      matchExists: true,
      matchedDisconnected: true,
      likeState: 1,
    });
    fireEvent.click(screen.getByRole("button", { name: "Liked" }));
    expect(toggleLikeTrack).not.toHaveBeenCalled();
  });

  it("forwards row click to handleTrackRowClick with isActive", () => {
    const handleTrackRowClick = vi.fn();
    const { rerender } = render(
      <TrackRow
        track={buildTrack()}
        index={0}
        spotifyTrack={null}
        matchExists={false}
        isActive={false}
        progress={0}
        likeState={0}
        matchedDisconnected={false}
        getTrackKey={(t) => t.title}
        handleTrackRowClick={handleTrackRowClick}
        playTrack={vi.fn()}
        openSpotifySearchModal={vi.fn()}
        toggleLikeTrack={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("listitem"));
    expect(handleTrackRowClick).toHaveBeenLastCalledWith(expect.any(Object), false);

    rerender(
      <TrackRow
        track={buildTrack()}
        index={0}
        spotifyTrack={null}
        matchExists={false}
        isActive
        progress={50}
        likeState={0}
        matchedDisconnected={false}
        getTrackKey={(t) => t.title}
        handleTrackRowClick={handleTrackRowClick}
        playTrack={vi.fn()}
        openSpotifySearchModal={vi.fn()}
        toggleLikeTrack={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("listitem"));
    expect(handleTrackRowClick).toHaveBeenLastCalledWith(expect.any(Object), true);
  });

  it("applies playing and progress styling when active", () => {
    const { container } = render(
      <TrackRow
        track={buildTrack()}
        index={0}
        spotifyTrack={null}
        matchExists={false}
        isActive
        progress={40}
        likeState={0}
        matchedDisconnected={false}
        getTrackKey={(t) => t.title}
        handleTrackRowClick={vi.fn()}
        playTrack={vi.fn()}
        openSpotifySearchModal={vi.fn()}
        toggleLikeTrack={vi.fn()}
      />,
    );
    const li = container.querySelector("li.track-playing");
    expect(li).toBeTruthy();
    const bar = container.querySelector(".track-progress-bar");
    expect(bar).toHaveStyle({ width: "40%" });
  });

  it("marks row when matched but disconnected from Spotify", () => {
    const { container } = render(
      <TrackRow
        track={buildTrack()}
        index={0}
        spotifyTrack={buildSpotifyTrack()}
        matchExists
        isActive={false}
        progress={0}
        likeState={0}
        matchedDisconnected
        getTrackKey={(t) => t.title}
        handleTrackRowClick={vi.fn()}
        playTrack={vi.fn()}
        openSpotifySearchModal={vi.fn()}
        toggleLikeTrack={vi.fn()}
      />,
    );
    expect(container.querySelector("li.track-matched-disconnected")).toBeTruthy();
  });
});
