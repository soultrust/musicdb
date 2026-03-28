import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

  it("handles successful detail + spotify matching + overview fetch", async () => {
    const setters = makeSetters();
    const detailPayload = {
      title: "Paranoid",
      artists: [{ name: "Black Sabbath" }],
      tracklist: [{ title: "War Pigs" }],
    };
    const authFetch = vi.fn(async (url) => {
      if (url.includes("/detail/")) {
        return { ok: true, json: async () => detailPayload };
      }
      if (url.includes("/album-overview/")) {
        return {
          ok: true,
          text: async () => JSON.stringify({ data: { overview: "Classic heavy metal landmark." } }),
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    const syncEspeciallyLikedForItem = vi.fn(async () => {});
    matchTracksToSpotifyApi.mockResolvedValue([{ catalog_title: "War Pigs", spotify_track: { id: "sp1" } }]);

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
    expect(setters.setOverview).toHaveBeenCalledWith("Classic heavy metal landmark.");
    expect(setters.setDetailLoading).toHaveBeenLastCalledWith(false);
  });

  it("sets detail error when item is missing id/type", async () => {
    const setters = makeSetters();
    const { result } = renderHook(() =>
      useDetailController({
        API_BASE,
        authFetch: vi.fn(),
        syncEspeciallyLikedForItem: vi.fn(),
        ...setters,
      }),
    );

    await result.current.handleItemClick({ id: "", type: "" });
    expect(setters.setDetailError).toHaveBeenCalledWith("Item missing id or type");
  });

  it("sets overview html error when overview endpoint returns html", async () => {
    const setters = makeSetters();
    const authFetch = vi.fn(async (url) => {
      if (url.includes("/detail/")) {
        return {
          ok: true,
          json: async () => ({
            title: "Album",
            artists: [{ name: "Artist" }],
            tracklist: [],
          }),
        };
      }
      if (url.includes("/album-overview/")) {
        return {
          ok: true,
          text: async () => "<!doctype html><html>Error</html>",
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    const { result } = renderHook(() =>
      useDetailController({
        API_BASE,
        authFetch,
        syncEspeciallyLikedForItem: vi.fn(async () => {}),
        ...setters,
      }),
    );

    await result.current.handleItemClick({ id: "x", type: "album", title: "Album" });
    expect(setters.setOverviewError).toHaveBeenCalledWith(
      "Overview unavailable (server error). Is the Django API running?",
    );
  });
});

