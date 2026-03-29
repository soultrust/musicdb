/** Shared helpers for catalog/Discogs title keys and manual Spotify row state. */

import type { SpotifyMatchRow } from "../types/musicDbSlices";

export function catalogOrDiscogsTitle(match: SpotifyMatchRow | undefined): string | undefined {
  return match?.catalog_title ?? match?.discogs_title;
}

export function findSpotifyMatchForTrackTitle(
  matches: SpotifyMatchRow[] | undefined,
  trackTitle: string | undefined,
): SpotifyMatchRow | undefined {
  return matches?.find((m) => catalogOrDiscogsTitle(m) === trackTitle);
}

export function isManualSpotifyMatchRow(match: SpotifyMatchRow | undefined): boolean {
  return Boolean(match?.manual_match && match?.spotify_track);
}
