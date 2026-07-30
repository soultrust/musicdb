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
      setResults: vi.fn(),
    };
  }

  it("handles successful detail + spotify matching", async () => {
    const setters = makeSetters();
    const detailPayload = {
      title: "Paranoid",
      artists: [{ name: "Black Sabbath" }],
      tracklist: [{ title: "War Pigs" }],
      release_group_id: "rg-1",
    };
    const authFetch = asAuthFetch(
      vi.fn(async (url: string) => {
        if (url.includes("/detail/")) {
          return { ok: true, json: async () => detailPayload };
        }
        if (url.includes("/album-overview/")) {
          return { ok: true, json: async () => ({ overview: "A landmark metal album." }) };
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
    expect(setters.setOverviewLoading).toHaveBeenCalledWith(true);
    expect(setters.setDetailLoading).toHaveBeenLastCalledWith(false);
  });

  it("fetches album overview for album detail into the overview state", async () => {
    const setters = makeSetters();
    const authFetch = asAuthFetch(
      vi.fn(async (url: string) => {
        if (url.includes("/detail/")) {
          return {
            ok: true,
            json: async () => ({ title: "OK Computer", release_group_id: "rg-ok" }),
          };
        }
        if (url.includes("/album-overview/") && url.includes("rg-ok")) {
          return {
            ok: true,
            json: async () => ({ overview: "OK Computer is Radiohead's third studio album." }),
          };
        }
        throw new Error(`Unexpected URL: ${url}`);
      }),
    );

    const { result } = renderHook(() =>
      useDetailController({
        API_BASE,
        authFetch,
        syncEspeciallyLikedForItem: vi.fn(),
        ...setters,
      }),
    );

    await result.current.handleItemClick({ id: "rg-ok", type: "album", title: "OK Computer" });

    await vi.waitFor(() => {
      expect(setters.setOverview).toHaveBeenCalledWith(
        "OK Computer is Radiohead's third studio album.",
      );
      expect(setters.setOverviewLoading).toHaveBeenCalledWith(false);
    });
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

