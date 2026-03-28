import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchSpotifySavedTrackIdsForMatches } from "./spotifyApi";

describe("fetchSpotifySavedTrackIdsForMatches", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty set without token or matches", async () => {
    expect((await fetchSpotifySavedTrackIdsForMatches([], "tok")).size).toBe(0);
    expect((await fetchSpotifySavedTrackIdsForMatches([{ spotify_track: { id: "a" } }], "")).size).toBe(
      0,
    );
  });

  it("maps contains response into saved id set", async () => {
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => [true, false, true],
    });
    const matches = [
      { spotify_track: { id: "a" } },
      { spotify_track: { id: "b" } },
      { spotify_track: { id: "c" } },
    ];
    const saved = await fetchSpotifySavedTrackIdsForMatches(matches, "tok");
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect([...saved].sort()).toEqual(["a", "c"]);
  });

  it("does not call Spotify when cancelled before first batch", async () => {
    const saved = await fetchSpotifySavedTrackIdsForMatches(
      [{ spotify_track: { id: "a" } }],
      "tok",
      { isCancelled: () => true },
    );
    expect(saved.size).toBe(0);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
