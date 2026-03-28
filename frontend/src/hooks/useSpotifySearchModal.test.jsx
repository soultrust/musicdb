import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSpotifySearchModal } from "./useSpotifySearchModal";

describe("useSpotifySearchModal", () => {
  const API_BASE = "http://localhost:8000";

  function makeDeps(overrides = {}) {
    return {
      API_BASE,
      authFetch: vi.fn(),
      detailData: { title: "Paranoid", artists: [{ name: "Black Sabbath" }] },
      selectedItem: { id: "rel-1", type: "release", title: "Paranoid" },
      setSpotifyMatches: vi.fn(),
      ...overrides,
    };
  }

  it("opens and closes modal while resetting state", () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useSpotifySearchModal(deps));

    act(() => result.current.openSpotifySearchModal("War Pigs"));
    expect(result.current.showSpotifySearchModal).toBe(true);
    expect(result.current.manualMatchTrackTitle).toBe("War Pigs");
    expect(result.current.spotifySearchQuery).toBe("War Pigs");
    expect(result.current.spotifySearchResults).toEqual([]);
    expect(result.current.spotifySearchFetched).toBe(false);

    act(() => result.current.closeSpotifySearchModal());
    expect(result.current.showSpotifySearchModal).toBe(false);
    expect(result.current.manualMatchTrackTitle).toBeNull();
    expect(result.current.spotifySearchQuery).toBe("");
    expect(result.current.spotifySearchArtist).toBe("");
    expect(result.current.spotifySearchAlbum).toBe("");
    expect(result.current.spotifySearchResults).toEqual([]);
  });

  it("pre-fills track title from open() with trimming", () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useSpotifySearchModal(deps));
    act(() => result.current.openSpotifySearchModal("  Monk's Dream  "));
    expect(result.current.manualMatchTrackTitle).toBe("Monk's Dream");
    expect(result.current.spotifySearchQuery).toBe("Monk's Dream");
  });

  it("searches spotify with artist hint and populates results", async () => {
    const deps = makeDeps({
      authFetch: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ tracks: [{ id: "sp1", name: "War Pigs" }] }),
      }),
    });
    const { result } = renderHook(() => useSpotifySearchModal(deps));

    act(() => {
      result.current.openSpotifySearchModal("War Pigs");
    });
    await act(async () => {
      await result.current.handleSpotifySearch({ preventDefault: vi.fn() });
    });

    expect(deps.authFetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/spotify/search/?"),
    );
    const calledUrl = deps.authFetch.mock.calls[0][0];
    expect(calledUrl).toContain("q=War+Pigs");
    expect(calledUrl).toContain("artist=Black+Sabbath");
    expect(calledUrl).toContain("album=Paranoid");
    expect(calledUrl).toContain("limit=15");
    expect(result.current.spotifySearchResults).toEqual([{ id: "sp1", name: "War Pigs" }]);
    expect(result.current.spotifySearchFetched).toBe(true);
    expect(result.current.spotifySearchLoading).toBe(false);
  });

  it("does not search on blank query", async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useSpotifySearchModal(deps));
    await act(async () => {
      await result.current.handleSpotifySearch({ preventDefault: vi.fn() });
    });
    expect(deps.authFetch).not.toHaveBeenCalled();
  });

  it("selecting a spotify track saves manual match and updates local matches", async () => {
    const setSpotifyMatches = vi.fn((updater) =>
      updater([{ catalog_title: "War Pigs", spotify_track: null }]),
    );
    const deps = makeDeps({
      setSpotifyMatches,
      authFetch: vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      }),
    });
    const { result } = renderHook(() => useSpotifySearchModal(deps));

    act(() => {
      result.current.openSpotifySearchModal("War Pigs");
    });
    await act(async () => {
      await result.current.handleSelectSpotifyTrack({
        id: "sp-123",
        uri: "spotify:track:sp-123",
        name: "War Pigs - 2012",
        artists: [{ name: "Black Sabbath" }],
      });
    });

    expect(deps.authFetch).toHaveBeenCalledWith(
      `${API_BASE}/api/search/manual-spotify-match/`,
      expect.objectContaining({ method: "POST" }),
    );
    const [, options] = deps.authFetch.mock.calls[0];
    const payload = JSON.parse(options.body);
    expect(payload.release_id).toBe("rel-1");
    expect(payload.track_title).toBe("War Pigs");
    expect(payload.spotify_track.id).toBe("sp-123");
    expect(setSpotifyMatches).toHaveBeenCalledTimes(1);
    expect(result.current.showSpotifySearchModal).toBe(false);
  });

  it("ignores manual select when missing required state", async () => {
    const deps = makeDeps({ selectedItem: null });
    const { result } = renderHook(() => useSpotifySearchModal(deps));
    await act(async () => {
      await result.current.handleSelectSpotifyTrack({ id: "sp1" });
    });
    expect(deps.authFetch).not.toHaveBeenCalled();
  });
});

