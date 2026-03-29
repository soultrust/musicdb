import type { SpotifyMatchRow } from "../types/musicDbSlices";

const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

/** Spotify `/me/tracks/contains` allows up to 50 ids per request */
const SPOTIFY_TRACKS_CONTAINS_BATCH = 50;

function bearerHeaders(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

/** @param trackIds Spotify track ids */
export function spotifyTracksContains(trackIds: string[], token: string): Promise<Response> {
  const q = trackIds.map(encodeURIComponent).join(",");
  return fetch(`${SPOTIFY_API_BASE}/me/tracks/contains?ids=${q}`, {
    headers: bearerHeaders(token),
  });
}

/**
 * For each match row with a Spotify track id, asks whether the user has saved that track (batched).
 */
export async function fetchSpotifySavedTrackIdsForMatches(
  matches: SpotifyMatchRow[],
  token: string | null | undefined,
  opts: { isCancelled?: () => boolean } = {},
): Promise<Set<string>> {
  const isCancelled = opts.isCancelled ?? (() => false);
  if (!token || !matches?.length) return new Set();

  const ids = matches.map((m) => m.spotify_track?.id).filter(Boolean) as string[];
  if (ids.length === 0) return new Set();

  const saved = new Set<string>();
  for (let i = 0; i < ids.length; i += SPOTIFY_TRACKS_CONTAINS_BATCH) {
    if (isCancelled()) break;
    const chunk = ids.slice(i, i + SPOTIFY_TRACKS_CONTAINS_BATCH);
    try {
      const res = await spotifyTracksContains(chunk, token);
      if (!res.ok || isCancelled()) break;
      const arr: boolean[] = await res.json();
      chunk.forEach((id, idx) => {
        if (arr[idx]) saved.add(id);
      });
    } catch {
      break;
    }
  }
  return saved;
}

export function spotifySaveUserTrack(trackId: string, token: string): Promise<Response> {
  return fetch(`${SPOTIFY_API_BASE}/me/tracks?ids=${encodeURIComponent(trackId)}`, {
    method: "PUT",
    headers: bearerHeaders(token),
  });
}

export function spotifyUnsaveUserTrack(trackId: string, token: string): Promise<Response> {
  return fetch(`${SPOTIFY_API_BASE}/me/tracks?ids=${encodeURIComponent(trackId)}`, {
    method: "DELETE",
    headers: bearerHeaders(token),
  });
}

/** @param spotifyUris e.g. ["spotify:track:..."] */
export function spotifyPlayerPlayUris(
  deviceId: string,
  spotifyUris: string[],
  token: string,
): Promise<Response> {
  return fetch(`${SPOTIFY_API_BASE}/me/player/play?device_id=${deviceId}`, {
    method: "PUT",
    headers: {
      ...bearerHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ uris: spotifyUris }),
  });
}
