import { describe, expect, it } from "vitest";
import type { CatalogTrack, DetailItem } from "../types/musicDbSlices";
import {
  computeNextLikedMapForEspeciallySync,
  especiallyLikedFingerprintForTrack,
  especiallyLikedFingerprintSetFromApi,
} from "./especiallyLikedSync";

function norm(v: unknown): number | null {
  if (v === 0 || v === 1 || v === 2) return v;
  return null;
}

function keyFor(item: DetailItem, track: CatalogTrack): string | null {
  return `${item.id}::${track.title}`;
}

describe("especiallyLikedSync", () => {
  const item = { id: "rel-1", type: "release" };

  it("especiallyLikedFingerprintForTrack matches API key shape", () => {
    expect(especiallyLikedFingerprintForTrack({ position: "1", title: "A" })).toBe("1::A");
    expect(especiallyLikedFingerprintForTrack({ title: "B" })).toBe("::B");
  });

  it("especiallyLikedFingerprintSetFromApi builds set", () => {
    const s = especiallyLikedFingerprintSetFromApi([
      { track_position: "2", track_title: "X" },
    ]);
    expect(s.has("2::X")).toBe(true);
  });

  it("computeNextLikedMapForEspeciallySync sets 2 when server lists track", () => {
    const prev = {};
    const tracklist = [{ position: "1", title: "T" }];
    const especiallySet = especiallyLikedFingerprintSetFromApi([
      { track_position: "1", track_title: "T" },
    ]);
    const next = computeNextLikedMapForEspeciallySync(
      prev,
      item,
      tracklist,
      especiallySet,
      norm,
      keyFor,
    );
    expect(next).toEqual({ "rel-1::T": 2 });
  });

  it("removes key when no longer especially liked on server", () => {
    const prev = { "rel-1::T": 2 };
    const tracklist = [{ position: "1", title: "T" }];
    const especiallySet = new Set<string>();
    const next = computeNextLikedMapForEspeciallySync(
      prev,
      item,
      tracklist,
      especiallySet,
      norm,
      keyFor,
    );
    expect(next).toEqual({});
  });

  it("returns null when unchanged", () => {
    const prev = { "rel-1::T": 2 };
    const tracklist = [{ position: "1", title: "T" }];
    const especiallySet = especiallyLikedFingerprintSetFromApi([
      { track_position: "1", track_title: "T" },
    ]);
    expect(
      computeNextLikedMapForEspeciallySync(prev, item, tracklist, especiallySet, norm, keyFor),
    ).toBeNull();
  });
});
