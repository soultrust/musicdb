/** Shared helpers for catalog/Discogs title keys and manual Spotify row state. */

export function catalogOrDiscogsTitle(match) {
  return match?.catalog_title ?? match?.discogs_title;
}

export function findSpotifyMatchForTrackTitle(matches, trackTitle) {
  return matches?.find((m) => catalogOrDiscogsTitle(m) === trackTitle);
}

export function isManualSpotifyMatchRow(match) {
  return Boolean(match?.manual_match && match?.spotify_track);
}
