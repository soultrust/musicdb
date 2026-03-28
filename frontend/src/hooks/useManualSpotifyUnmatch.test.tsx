import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useManualSpotifyUnmatch } from "./useManualSpotifyUnmatch";

describe("useManualSpotifyUnmatch", () => {
  const API_BASE = "http://localhost:8000";

  function makeDeps(overrides = {}) {
    return {
      API_BASE,
      authFetch: vi.fn(),
      selectedItem: { id: "rel-1", type: "release" },
      spotifyMatches: [],
      openSpotifySearchModal: vi.fn(),
      refreshSpotifyMatches: vi.fn().mockResolvedValue(undefined),
      ...overrides,
    };
  }

  it("opens search modal when row is not a manual match", () => {
    const deps = makeDeps({
      spotifyMatches: [
        { catalog_title: "War Pigs", spotify_track: { id: "s1" }, manual_match: false },
      ],
    });
    const { result } = renderHook(() => useManualSpotifyUnmatch(deps));

    act(() => result.current.handleSpotifySearchButtonClick("War Pigs"));
    expect(deps.openSpotifySearchModal).toHaveBeenCalledWith("War Pigs");
    expect(result.current.unmatchSpotifyTrackTitle).toBeNull();
  });

  it("sets unmatch title when manual match row with Spotify track", () => {
    const deps = makeDeps({
      spotifyMatches: [
        {
          catalog_title: "War Pigs",
          spotify_track: { id: "s1" },
          manual_match: true,
        },
      ],
    });
    const { result } = renderHook(() => useManualSpotifyUnmatch(deps));

    act(() => result.current.handleSpotifySearchButtonClick("War Pigs"));
    expect(deps.openSpotifySearchModal).not.toHaveBeenCalled();
    expect(result.current.unmatchSpotifyTrackTitle).toBe("War Pigs");
  });

  it("closes confirm without calling API", () => {
    const deps = makeDeps({
      spotifyMatches: [
        {
          catalog_title: "War Pigs",
          spotify_track: { id: "s1" },
          manual_match: true,
        },
      ],
    });
    const { result } = renderHook(() => useManualSpotifyUnmatch(deps));

    act(() => result.current.handleSpotifySearchButtonClick("War Pigs"));
    act(() => result.current.closeUnmatchSpotifyConfirm());
    expect(result.current.unmatchSpotifyTrackTitle).toBeNull();
    expect(deps.authFetch).not.toHaveBeenCalled();
  });

  it("DELETEs manual match then refreshes on 204", async () => {
    const deps = makeDeps({
      authFetch: vi.fn().mockResolvedValue({ ok: false, status: 204 }),
      spotifyMatches: [
        {
          catalog_title: "War Pigs",
          spotify_track: { id: "s1" },
          manual_match: true,
        },
      ],
    });
    const { result } = renderHook(() => useManualSpotifyUnmatch(deps));

    act(() => result.current.handleSpotifySearchButtonClick("War Pigs"));
    await act(async () => {
      await result.current.confirmUnmatchSpotify();
    });

    expect(deps.authFetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/search/manual-spotify-match/?release_id=rel-1&track_title=War+Pigs",
      { method: "DELETE" },
    );
    expect(deps.refreshSpotifyMatches).toHaveBeenCalledTimes(1);
    expect(result.current.unmatchSpotifyTrackTitle).toBeNull();
    expect(result.current.unmatchSpotifyLoading).toBe(false);
  });

  it("does not confirm when selected release id missing", async () => {
    const deps = makeDeps({
      selectedItem: null,
      spotifyMatches: [
        {
          catalog_title: "War Pigs",
          spotify_track: { id: "s1" },
          manual_match: true,
        },
      ],
    });
    const { result } = renderHook(() => useManualSpotifyUnmatch(deps));

    act(() => result.current.handleSpotifySearchButtonClick("War Pigs"));
    await act(async () => {
      await result.current.confirmUnmatchSpotify();
    });

    expect(deps.authFetch).not.toHaveBeenCalled();
  });
});
