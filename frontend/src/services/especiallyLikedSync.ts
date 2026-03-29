/**
 * Pure helpers for reconciling server "especially liked" tracks with local liked-track map state.
 */

import type { CatalogTrack, DetailItem } from "../types/musicDbSlices";

/** Same shape as API list keys: `position::title` */
export function especiallyLikedFingerprintForTrack(track: CatalogTrack): string {
  const pos = track.position != null && track.position !== "" ? String(track.position) : "";
  return `${pos}::${String(track.title || "").trim()}`;
}

export type ApiEspeciallyLikedTrackRow = { track_position?: string; track_title?: string };

/** Build a set of fingerprints from GET especially-liked response `tracks`. */
export function especiallyLikedFingerprintSetFromApi(
  tracks: ApiEspeciallyLikedTrackRow[] | undefined,
): Set<string> {
  return new Set(
    (tracks || []).map(
      (t) => `${String(t.track_position || "")}::${String(t.track_title || "").trim()}`,
    ),
  );
}

/**
 * Apply server especially-liked state to a copy of `prev` map (0–2 per track key).
 */
export function computeNextLikedMapForEspeciallySync(
  prev: Record<string, number>,
  item: DetailItem,
  tracklist: CatalogTrack[],
  especiallySet: Set<string>,
  normalizeStoredLikeValue: (v: unknown) => number | null,
  buildTrackKeyForItem: (item: DetailItem, track: CatalogTrack) => string | null,
): Record<string, number> | null {
  const next: Record<string, number> = { ...prev };
  let changed = false;
  for (const track of tracklist) {
    const key = buildTrackKeyForItem(item, track);
    if (!key) continue;
    const fp = especiallyLikedFingerprintForTrack(track);
    const current = normalizeStoredLikeValue(next[key]);
    if (especiallySet.has(fp)) {
      if (current !== 2) {
        next[key] = 2;
        changed = true;
      }
    } else if (current === 2) {
      delete next[key];
      changed = true;
    }
  }
  return changed ? next : null;
}
