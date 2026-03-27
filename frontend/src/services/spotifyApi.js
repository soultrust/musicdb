const SPOTIFY_API_BASE = "https://api.spotify.com/v1";

function bearerHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

/** @param {string[]} trackIds */
export function spotifyTracksContains(trackIds, token) {
  const q = trackIds.map(encodeURIComponent).join(",");
  return fetch(`${SPOTIFY_API_BASE}/me/tracks/contains?ids=${q}`, {
    headers: bearerHeaders(token),
  });
}

export function spotifySaveUserTrack(trackId, token) {
  return fetch(`${SPOTIFY_API_BASE}/me/tracks?ids=${encodeURIComponent(trackId)}`, {
    method: "PUT",
    headers: bearerHeaders(token),
  });
}

export function spotifyUnsaveUserTrack(trackId, token) {
  return fetch(`${SPOTIFY_API_BASE}/me/tracks?ids=${encodeURIComponent(trackId)}`, {
    method: "DELETE",
    headers: bearerHeaders(token),
  });
}

/** @param {string[]} spotifyUris e.g. ["spotify:track:..."] */
export function spotifyPlayerPlayUris(deviceId, spotifyUris, token) {
  return fetch(`${SPOTIFY_API_BASE}/me/player/play?device_id=${deviceId}`, {
    method: "PUT",
    headers: {
      ...bearerHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ uris: spotifyUris }),
  });
}
