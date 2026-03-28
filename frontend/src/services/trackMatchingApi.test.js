import { describe, expect, it, vi } from "vitest";
import { matchTracksToSpotifyApi } from "./trackMatchingApi";

describe("matchTracksToSpotifyApi", () => {
  const API_BASE = "http://localhost:8000";

  it("returns auto matches when matching succeeds", async () => {
    const authFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          matches: [{ catalog_title: "Track A", spotify_track: { id: "sp-a" } }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ matches: [] }),
      });

    const out = await matchTracksToSpotifyApi({
      authFetch,
      API_BASE,
      tracklist: [{ title: "Track A" }],
      artists: [{ name: "Artist" }],
      releaseId: "rel-1",
    });

    expect(out).toEqual([{ catalog_title: "Track A", spotify_track: { id: "sp-a" } }]);
  });

  it("applies manual overrides when present", async () => {
    const authFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          matches: [{ catalog_title: "Track A", spotify_track: { id: "auto-a" } }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          matches: [
            { track_title: "Track A", spotify_track: { id: "manual-a", uri: "spotify:track:manual-a" } },
          ],
        }),
      });

    const out = await matchTracksToSpotifyApi({
      authFetch,
      API_BASE,
      tracklist: [{ title: "Track A" }],
      artists: [{ name: "Artist" }],
      releaseId: "rel-1",
    });

    expect(out).toEqual([
      { catalog_title: "Track A", spotify_track: { id: "manual-a", uri: "spotify:track:manual-a" } },
    ]);
  });

  it("swallows manual-match fetch failures", async () => {
    const authFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          matches: [{ catalog_title: "Track A", spotify_track: { id: "auto-a" } }],
        }),
      })
      .mockRejectedValueOnce(new Error("network down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const out = await matchTracksToSpotifyApi({
      authFetch,
      API_BASE,
      tracklist: [{ title: "Track A" }],
      artists: [{ name: "Artist" }],
      releaseId: "rel-1",
    });

    expect(out).toEqual([{ catalog_title: "Track A", spotify_track: { id: "auto-a" } }]);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

