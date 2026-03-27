import { useEffect, useRef, useState } from "react";

/**
 * When the user selects the Spotify playlists pseudo-list (`viewListId === "spotify-playlists"`),
 * loads their Spotify playlists and, when one is selected, that playlist’s tracks.
 * Uses the Spotify Bearer token header; resets state when leaving that view or on missing tokens.
 *
 * @param {object} args
 * @param {string} args.API_BASE MusicDB API origin (proxies Spotify endpoints)
 * @param {string|null} args.accessToken MusicDB JWT (gate / session)
 * @param {string|null} args.spotifyToken Spotify access token
 * @param {string|null} args.viewListId Active list id or `"spotify-playlists"`
 * @param {function} args.authFetch
 */
export function useSpotifyPlaylistsView({
  API_BASE,
  accessToken,
  spotifyToken,
  viewListId,
  authFetch,
}) {
  const [spotifyPlaylists, setSpotifyPlaylists] = useState([]);
  const [spotifyPlaylistsLoading, setSpotifyPlaylistsLoading] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [playlistTracksData, setPlaylistTracksData] = useState(null);
  const [playlistTracksLoading, setPlaylistTracksLoading] = useState(false);

  const authFetchRef = useRef(authFetch);

  useEffect(() => {
    authFetchRef.current = authFetch;
  }, [authFetch]);

  useEffect(() => {
    if (viewListId !== "spotify-playlists" || !spotifyToken || !accessToken) {
      const id = setTimeout(() => {
        setSpotifyPlaylists([]);
        setSelectedPlaylistId(null);
        setPlaylistTracksData(null);
      }, 0);
      return () => clearTimeout(id);
    }
    const startId = setTimeout(() => setSpotifyPlaylistsLoading(true), 0);
    let cancelled = false;
    authFetchRef.current(`${API_BASE}/api/spotify/playlists/`, {
      headers: { Authorization: `Bearer ${spotifyToken}` },
    })
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (!cancelled && data) setSpotifyPlaylists(data.playlists || []);
      })
      .catch((err) => {
        console.error("Failed to fetch Spotify playlists:", err);
      })
      .finally(() => {
        if (!cancelled) setSpotifyPlaylistsLoading(false);
      });
    return () => {
      clearTimeout(startId);
      cancelled = true;
    };
  }, [viewListId, spotifyToken, accessToken, API_BASE]);

  useEffect(() => {
    if (!selectedPlaylistId || !spotifyToken || !accessToken || viewListId !== "spotify-playlists") {
      const id = setTimeout(() => setPlaylistTracksData(null), 0);
      return () => clearTimeout(id);
    }
    const startId = setTimeout(() => setPlaylistTracksLoading(true), 0);
    let cancelled = false;
    authFetchRef.current(`${API_BASE}/api/spotify/playlists/${selectedPlaylistId}/tracks/`, {
      headers: { Authorization: `Bearer ${spotifyToken}` },
    })
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (!cancelled && data) setPlaylistTracksData(data);
      })
      .catch((err) => {
        console.error("Failed to fetch playlist tracks:", err);
      })
      .finally(() => {
        if (!cancelled) setPlaylistTracksLoading(false);
      });
    return () => {
      clearTimeout(startId);
      cancelled = true;
    };
  }, [selectedPlaylistId, spotifyToken, accessToken, viewListId, API_BASE]);

  return {
    spotifyPlaylists,
    spotifyPlaylistsLoading,
    selectedPlaylistId,
    setSelectedPlaylistId,
    playlistTracksData,
    setPlaylistTracksData,
    playlistTracksLoading,
  };
}
