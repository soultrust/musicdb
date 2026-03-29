import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi, type Mock } from "vitest";
import { asAuthFetch } from "../test/helpers";
import { matchTracksToSpotifyApi } from "../services/trackMatchingApi";
import { useSpotifyMatchSync } from "./useSpotifyMatchSync";

vi.mock("../services/trackMatchingApi", () => ({
  matchTracksToSpotifyApi: vi.fn(),
}));

describe("useSpotifyMatchSync", () => {
  const API_BASE = "http://localhost:8000";
  const authFetch = asAuthFetch(vi.fn());
  const detailData = {
    tracklist: [{ title: "A" }],
    artists: [{ name: "Art" }],
  };
  const selectedItem = { id: "rel-1", type: "release" as const };

  it("refreshSpotifyMatches loads matches and clears loading", async () => {
    vi.mocked(matchTracksToSpotifyApi as Mock).mockResolvedValue([
      { catalog_title: "A", spotify_track: { id: "s1" } },
    ]);

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
    vi.mocked(matchTracksToSpotifyApi as Mock).mockClear();
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
