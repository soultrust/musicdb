import { describe, expect, it } from "vitest";
import {
  buildTrackKeyForItem,
  parseTrackKeyForEspeciallyLiked,
} from "./trackKeys";

describe("trackKeys helpers", () => {
  it("builds a stable key from item + track", () => {
    const key = buildTrackKeyForItem(
      { type: "release", id: "abc-123" },
      { position: "1", title: "Track Name" },
    );
    expect(key).toBe("release-abc-123-1-Track Name");
  });

  it("returns null when item is missing", () => {
    expect(buildTrackKeyForItem(null, { position: "1", title: "X" })).toBeNull();
  });

  it("parses key for supported prefixes", () => {
    const parsed = parseTrackKeyForEspeciallyLiked(
      "master-11111111-1111-1111-1111-111111111111-2-Song",
    );
    expect(parsed).toEqual({
      itemType: "master",
      itemId: "11111111-1111-1111-1111-111111111111",
      trackPosition: "2",
      trackTitle: "Song",
    });
  });

  it("returns null for invalid key format", () => {
    expect(parseTrackKeyForEspeciallyLiked("song-1-2-3")).toBeNull();
    expect(parseTrackKeyForEspeciallyLiked("release-no-dashes")).toBeNull();
    expect(parseTrackKeyForEspeciallyLiked(null)).toBeNull();
  });
});

