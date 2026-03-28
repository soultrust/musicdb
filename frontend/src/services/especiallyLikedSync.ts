/**
 * Pure helpers for reconciling server "especially liked" tracks with local liked-track map state.
 */

/** Same shape as API list keys: `position::title` */
export function especiallyLikedFingerprintForTrack(track) {
  const pos = track.position != null && track.position !== "" ? String(track.position) : "";
  return `${pos}::${String(track.title || "").trim()}`;
}

/** Build a set of fingerprints from GET especially-liked response `tracks`. */
export function especiallyLikedFingerprintSetFromApi(tracks) {
  return new Set(
    (tracks || []).map(
      (t) => `${String(t.track_position || "")}::${String(t.track_title || "").trim()}`,
    ),
  );
}

/**
 * Apply server especially-liked state to a copy of `prev` map (0–2 per track key).
 * @param {Record<string, unknown>} prev
 * @param {object} item — selected release/master/album (must work with buildTrackKeyForItem)
 * @param {object[]} tracklist
 * @param {Set<string>} especiallySet — fingerprints from {@link especiallyLikedFingerprintSetFromApi}
 * @param {(v: unknown) => number | null} normalizeStoredLikeValue
 * @param {(item: object, track: object) => string | null} buildTrackKeyForItem
 * @returns {Record<string, number> | null} `next` if changed, else `null`
 */
export function computeNextLikedMapForEspeciallySync(
  prev,
  item,
  tracklist,
  especiallySet,
  normalizeStoredLikeValue,
  buildTrackKeyForItem,
) {
  const next = { ...prev };
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
