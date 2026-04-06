import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi, type Mock } from "vitest";
import { asAuthFetch } from "../test/helpers";
import { useDetailController } from "./useDetailController";

vi.mock("../services/trackMatchingApi", () => ({
  matchTracksToSpotifyApi: vi.fn(),
}));

import { matchTracksToSpotifyApi } from "../services/trackMatchingApi";

describe("useDetailController", () => {
  const API_BASE = "http://localhost:8000";

  function makeSetters() {
    return {
      setSelectedItem: vi.fn(),
      setDetailData: vi.fn(),
      setDetailLoading: vi.fn(),
      setDetailError: vi.fn(),
      setOverview: vi.fn(),
      setOverviewLoading: vi.fn(),
      setOverviewError: vi.fn(),
      setAlbumArtReady: vi.fn(),
      setAlbumArtRetryKey: vi.fn(),
      setSpotifyMatches: vi.fn(),
      setSpotifyMatching: vi.fn(),
    };
  }

  it("handles successful detail + spotify matching", async () => {
    const setters = makeSetters();
    const detailPayload = {
      title: "Paranoid",
      artists: [{ name: "Black Sabbath" }],
      tracklist: [{ title: "War Pigs" }],
    };
    const authFetch = asAuthFetch(
      vi.fn(async (url: string) => {
        if (url.includes("/detail/")) {
          return { ok: true, json: async () => detailPayload };
        }
        throw new Error(`Unexpected URL: ${url}`);
      }),
    );
    const syncEspeciallyLikedForItem = vi.fn(async () => {});
    vi.mocked(matchTracksToSpotifyApi as Mock).mockResolvedValue([
      { catalog_title: "War Pigs", spotify_track: { id: "sp1" } },
    ]);

    const { result } = renderHook(() =>
      useDetailController({
        API_BASE,
        authFetch,
        syncEspeciallyLikedForItem,
        ...setters,
      }),
    );

    await result.current.handleItemClick({ id: "rel-1", type: "release", title: "Paranoid" });

    expect(setters.setSelectedItem).toHaveBeenCalled();
    expect(setters.setDetailData).toHaveBeenCalledWith(detailPayload);
    expect(syncEspeciallyLikedForItem).toHaveBeenCalled();
    expect(matchTracksToSpotifyApi).toHaveBeenCalled();
    expect(setters.setSpotifyMatches).toHaveBeenCalledWith([
      { catalog_title: "War Pigs", spotify_track: { id: "sp1" } },
    ]);
    expect(setters.setDetailLoading).toHaveBeenLastCalledWith(false);
  });

  it("sets detail error when item is missing id/type", async () => {
    const setters = makeSetters();
    const { result } = renderHook(() =>
      useDetailController({
        API_BASE,
        authFetch: asAuthFetch(vi.fn()),
        syncEspeciallyLikedForItem: vi.fn(),
        ...setters,
      }),
    );

    await result.current.handleItemClick({ id: "", type: "" });
    expect(setters.setDetailError).toHaveBeenCalledWith("Item missing id or type");
  });

});

