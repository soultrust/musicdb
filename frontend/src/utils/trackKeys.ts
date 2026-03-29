// Shared helpers for mapping tracks in the UI to stable identifiers.
//
// The UI uses a string key:
//   `${item.type}-${item.id}-${position}-${track.title}`
//
// For "especially liked" backfill, we parse that key back into the payload
// expected by the backend.

import type { CatalogTrack, DetailItem } from "../types/musicDbSlices";

export function buildTrackKeyForItem(item: DetailItem | null, track: CatalogTrack): string | null {
  if (!item) return null;
  const position = track.position != null && track.position !== "" ? String(track.position) : "";
  return `${item.type}-${item.id}-${position}-${track.title}`;
}

export function parseTrackKeyForEspeciallyLiked(key: unknown): {
  itemType: string;
  itemId: string;
  trackPosition: string;
  trackTitle: string;
} | null {
  if (!key || typeof key !== "string") return null;
  const prefixes = ["release-", "master-", "album-"];
  const prefix = prefixes.find((p) => key.startsWith(p));
  if (!prefix) return null;

  // remove trailing '-'
  const itemType = prefix.slice(0, -1);
  const remainder = key.slice(prefix.length); // itemId-position-title

  // Split from the right to avoid breaking on '-' inside itemId / title.
  const lastDash = remainder.lastIndexOf("-");
  if (lastDash === -1) return null;
  const trackTitle = remainder.slice(lastDash + 1);

  const remainder2 = remainder.slice(0, lastDash); // itemId-position
  const secondLastDash = remainder2.lastIndexOf("-");
  if (secondLastDash === -1) return null;
  const trackPosition = remainder2.slice(secondLastDash + 1);
  const itemId = remainder2.slice(0, secondLastDash);

  return { itemType, itemId, trackPosition, trackTitle };
}
