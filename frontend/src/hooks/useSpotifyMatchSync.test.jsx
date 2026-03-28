import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { matchTracksToSpotifyApi } from "../services/trackMatchingApi";
import { useSpotifyMatchSync } from "./useSpotifyMatchSync";

vi.mock("../services/trackMatchingApi", () => ({
  matchTracksToSpotifyApi: vi.fn(),
}));

describe("useSpotifyMatchSync", () => {
  const API_BASE = "http://localhost:8000";
  const authFetch = vi.fn();
  const detailData = {
    tracklist: [{ title: "A" }],
    artists: [{ name: "Art" }],
  };
  const selectedItem = { id: "rel-1" };

  it("refreshSpotifyMatches loads matches and clears loading", async () => {
    matchTracksToSpotifyApi.mockResolvedValue([{ catalog_title: "A", spotify_track: { id: "s1" } }]);

    const { result } = renderHook(() =>
      useSpotifyMatchSync({
        API_BASE,
        authFetch,
        detailData,
        selectedItem,
      }),
    );

    await act(async () => {
      await result.current.refreshSpotifyMatches();
    });

    expect(matchTracksToSpotifyApi).toHaveBeenCalledWith({
      authFetch,
      API_BASE,
      tracklist: detailData.tracklist,
      artists: detailData.artists,
      releaseId: "rel-1",
    });
    expect(result.current.spotifyMatches).toEqual([
      { catalog_title: "A", spotify_track: { id: "s1" } },
    ]);
    expect(result.current.spotifyMatching).toBe(false);
  });

  it("refreshSpotifyMatches no-ops without tracklist", async () => {
    matchTracksToSpotifyApi.mockClear();
    const { result } = renderHook(() =>
      useSpotifyMatchSync({
        API_BASE,
        authFetch,
        detailData: { artists: [{ name: "A" }] },
        selectedItem,
      }),
    );

    await act(async () => {
      await result.current.refreshSpotifyMatches();
    });

    expect(matchTracksToSpotifyApi).not.toHaveBeenCalled();
  });
});
