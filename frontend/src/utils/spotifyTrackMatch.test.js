import { describe, expect, it } from "vitest";
import {
  catalogOrDiscogsTitle,
  findSpotifyMatchForTrackTitle,
  isManualSpotifyMatchRow,
} from "./spotifyTrackMatch";

describe("spotifyTrackMatch", () => {
  describe("catalogOrDiscogsTitle", () => {
    it("prefers catalog_title over discogs_title", () => {
      expect(
        catalogOrDiscogsTitle({ catalog_title: "A", discogs_title: "B" }),
      ).toBe("A");
    });

    it("falls back to discogs_title", () => {
      expect(catalogOrDiscogsTitle({ discogs_title: "B" })).toBe("B");
    });

    it("returns undefined for missing match", () => {
      expect(catalogOrDiscogsTitle(undefined)).toBeUndefined();
    });
  });

  describe("findSpotifyMatchForTrackTitle", () => {
    const rows = [
      { catalog_title: "One", spotify_track: { id: "1" } },
      { discogs_title: "Two", spotify_track: { id: "2" } },
    ];

    it("finds by catalog_title", () => {
      expect(findSpotifyMatchForTrackTitle(rows, "One")).toEqual(rows[0]);
    });

    it("finds by discogs_title when catalog absent", () => {
      expect(findSpotifyMatchForTrackTitle(rows, "Two")).toEqual(rows[1]);
    });

    it("returns undefined when no match", () => {
      expect(findSpotifyMatchForTrackTitle(rows, "Nope")).toBeUndefined();
    });

    it("handles undefined matches list", () => {
      expect(findSpotifyMatchForTrackTitle(undefined, "One")).toBeUndefined();
    });
  });

  describe("isManualSpotifyMatchRow", () => {
    it("is true only when manual_match and spotify_track present", () => {
      expect(
        isManualSpotifyMatchRow({
          manual_match: true,
          spotify_track: { uri: "spotify:track:x" },
        }),
      ).toBe(true);
    });

    it("is false without manual_match", () => {
      expect(
        isManualSpotifyMatchRow({
          spotify_track: { uri: "x" },
        }),
      ).toBe(false);
    });

    it("is false without spotify_track", () => {
      expect(
        isManualSpotifyMatchRow({
          manual_match: true,
        }),
      ).toBe(false);
    });

    it("is false for undefined", () => {
      expect(isManualSpotifyMatchRow(undefined)).toBe(false);
    });
  });
});
