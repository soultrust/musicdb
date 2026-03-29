import { manualSpotifyMatchesUrl } from "./searchApi";
import { catalogOrDiscogsTitle } from "../utils/spotifyTrackMatch";
import type { SpotifyArtist, SpotifyMatchRow } from "../types/musicDbSlices";
import type { AuthFetchFn } from "./especiallyLikedApi";

type CatalogTrackish = { title?: string };
type MatchRow = SpotifyMatchRow;

// Catalog tracklist → server-side Spotify matching,
// plus optional manual track→Spotify overrides.
//
// This is intentionally UI-agnostic: it just returns match rows.

export async function matchTracksToSpotifyApi({
  authFetch,
  API_BASE,
  tracklist,
  artists,
  releaseId,
}: {
  authFetch: AuthFetchFn;
  API_BASE: string;
  tracklist: CatalogTrackish[];
  artists: SpotifyArtist[];
  releaseId?: string | number | null;
}): Promise<MatchRow[]> {
  const tracks = tracklist.map((track) => ({
    title: track.title,
    artists: artists.map((a) => a.name),
  }));

  const res = await authFetch(`${API_BASE}/api/spotify/match-tracks/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tracks }),
  });

  const data = (await res.json()) as { matches?: MatchRow[] };
  let matches: SpotifyMatchRow[] = res.ok ? data.matches || [] : [];

  if (res.ok && releaseId) {
    try {
      const manRes = await authFetch(manualSpotifyMatchesUrl(API_BASE, releaseId));
      const manData = (await manRes.json()) as { matches?: Array<Record<string, unknown>> };

      if (manRes.ok && manData.matches?.length) {
        matches = matches.map((m): SpotifyMatchRow => {
          const matchTitle = catalogOrDiscogsTitle(m);
          const manual = manData.matches!.find((mm) => {
            const row = mm as { track_title?: string };
            return row.track_title === matchTitle;
          }) as { spotify_track?: unknown } | undefined;
          if (manual?.spotify_track) {
            return { ...m, spotify_track: manual.spotify_track as SpotifyMatchRow["spotify_track"], manual_match: true };
          }
          return m;
        });
      }
    } catch (err) {
      // Keep behavior close to App: swallow manual-match failure and return auto matches.
      console.error("Failed to load manual Spotify matches:", err);
    }
  }

  return matches;
}
