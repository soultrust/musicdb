// Discogs/MusicBrainz tracklist → server-side Spotify matching,
// plus optional manual Discogs→Spotify overrides.
//
// This is intentionally UI-agnostic: it just returns match rows.

export async function matchTracksToSpotifyApi({
  authFetch,
  API_BASE,
  tracklist,
  artists,
  releaseId,
}) {
  const tracks = tracklist.map((track) => ({
    title: track.title,
    artists: artists.map((a) => a.name),
  }));

  const res = await authFetch(`${API_BASE}/api/spotify/match-tracks/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tracks }),
  });

  const data = await res.json();
  let matches = res.ok ? data.matches || [] : [];

  if (res.ok && releaseId) {
    try {
      const manRes = await authFetch(
        `${API_BASE}/api/search/manual-spotify-matches/?release_id=${encodeURIComponent(
          releaseId,
        )}`,
      );
      const manData = await manRes.json();

      if (manRes.ok && manData.matches?.length) {
        matches = matches.map((m) => {
          // Backend uses `track_title` in manual rows and `discogs_title` in match rows.
          const manual = manData.matches.find((mm) => mm.track_title === m.discogs_title);
          if (manual?.spotify_track) return { ...m, spotify_track: manual.spotify_track };
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

