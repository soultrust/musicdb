import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/especiallyLikedApi", () => ({
  getEspeciallyLikedTracksApi: vi.fn(),
  setEspeciallyLikedTrackApi: vi.fn(),
}));

vi.mock("../services/spotifyApi", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    spotifyTracksContains: vi.fn(),
    spotifySaveUserTrack: vi.fn(() => Promise.resolve({ ok: true })),
    spotifyUnsaveUserTrack: vi.fn(() => Promise.resolve({ ok: true })),
  };
});

import { useLikedTracks } from "./useLikedTracks";
import {
  getEspeciallyLikedTracksApi,
  setEspeciallyLikedTrackApi,
} from "../services/especiallyLikedApi";
import {
  spotifySaveUserTrack,
  spotifyTracksContains,
  spotifyUnsaveUserTrack,
} from "../services/spotifyApi";

describe("useLikedTracks", () => {
  const API_BASE = "http://localhost:8000";
  const selectedItem = { id: "rel-1", type: "release", title: "Album" };
  const detailData = {
    title: "Album",
    tracklist: [
      { position: "1", title: "Track A" },
      { position: "2", title: "Track B" },
    ],
  };
  const spotifyMatches = [
    { catalog_title: "Track A", spotify_track: { id: "sp-a" } },
    { catalog_title: "Track B", spotify_track: { id: "sp-b" } },
  ];

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    spotifyTracksContains.mockResolvedValue({
      ok: true,
      json: async () => [false, false],
    });
    getEspeciallyLikedTracksApi.mockResolvedValue({ ok: true, data: { tracks: [] } });
    setEspeciallyLikedTrackApi.mockResolvedValue({ ok: true, data: { ok: true } });
  });

  function renderLikedHook(overrides = {}) {
    return renderHook(() =>
      useLikedTracks({
        API_BASE,
        authFetch: vi.fn(),
        accessToken: "jwt",
        selectedItem,
        detailData,
        spotifyMatches,
        spotifyToken: null,
        ...overrides,
      }),
    );
  }

  it("cycles like state 0 -> 1 -> 2 -> 0 and persists especially-liked", async () => {
    const { result } = renderLikedHook();
    const track = detailData.tracklist[0];

    expect(result.current.getDisplayLikeState(track)).toBe(0);

    act(() => result.current.toggleLikeTrack(track));
    expect(result.current.getDisplayLikeState(track)).toBe(1);

    act(() => result.current.toggleLikeTrack(track));
    expect(result.current.getDisplayLikeState(track)).toBe(2);

    act(() => result.current.toggleLikeTrack(track));
    expect(result.current.getDisplayLikeState(track)).toBe(0);

    await waitFor(() => {
      expect(setEspeciallyLikedTrackApi).toHaveBeenCalledTimes(3);
    });
    // second call corresponds to state=2
    expect(setEspeciallyLikedTrackApi.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        itemType: "release",
        itemId: "rel-1",
        trackTitle: "Track A",
        trackPosition: "1",
        especiallyLiked: true,
      }),
    );
  });

  it("invokes Spotify save/unsave when spotify token and match exist", async () => {
    const { result } = renderLikedHook({ spotifyToken: "spotify-token" });
    const track = detailData.tracklist[0];

    act(() => result.current.toggleLikeTrack(track)); // 0 -> 1 => save
    await waitFor(() => expect(spotifySaveUserTrack).toHaveBeenCalledWith("sp-a", "spotify-token"));

    act(() => result.current.toggleLikeTrack(track)); // 1 -> 2
    act(() => result.current.toggleLikeTrack(track)); // 2 -> 0 => unsave
    await waitFor(() =>
      expect(spotifyUnsaveUserTrack).toHaveBeenCalledWith("sp-a", "spotify-token"),
    );
  });

  it("syncEspeciallyLikedForItem marks server especially-liked tracks as state=2", async () => {
    getEspeciallyLikedTracksApi.mockResolvedValueOnce({
      ok: true,
      data: { tracks: [{ track_title: "Track B", track_position: "2" }] },
    });
    const { result } = renderLikedHook();

    await act(async () => {
      await result.current.syncEspeciallyLikedForItem(selectedItem, detailData);
    });

    expect(result.current.getDisplayLikeState(detailData.tracklist[0])).toBe(0);
    expect(result.current.getDisplayLikeState(detailData.tracklist[1])).toBe(2);
  });
});

