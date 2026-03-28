import { describe, expect, it, vi } from "vitest";
import { getEspeciallyLikedTracksApi, setEspeciallyLikedTrackApi } from "./especiallyLikedApi";

describe("especiallyLikedApi", () => {
  const API_BASE = "http://localhost:8000";

  it("getEspeciallyLikedTracksApi returns ok+data", async () => {
    const authFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ tracks: [{ track_title: "A", track_position: "1" }] }),
    });

    const out = await getEspeciallyLikedTracksApi({
      authFetch,
      API_BASE,
      itemType: "release",
      itemId: "abc",
    });

    expect(out).toEqual({
      ok: true,
      data: { tracks: [{ track_title: "A", track_position: "1" }] },
    });
  });

  it("setEspeciallyLikedTrackApi posts normalized payload", async () => {
    const authFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    });

    await setEspeciallyLikedTrackApi({
      authFetch,
      API_BASE,
      itemType: "album",
      itemId: "id-1",
      trackTitle: "",
      trackPosition: "",
      especiallyLiked: false,
    });

    const [, options] = authFetch.mock.calls[0];
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({
      item_type: "album",
      item_id: "id-1",
      track_title: "",
      track_position: "",
      especially_liked: false,
    });
  });
});

