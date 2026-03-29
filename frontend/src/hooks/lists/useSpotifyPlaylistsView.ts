import { useEffect, useRef, useState } from "react";
import type { AuthFetchFn } from "../../services/especiallyLikedApi";
import type { PlaylistTracksData } from "../../types/musicDbSlices";

type SpotifyPlaylistRow = { id: string; name: string; owner?: string; [key: string]: unknown };

/**
 * When the user selects the Spotify playlists pseudo-list (`viewListId === "spotify-playlists"`),
 * loads their Spotify playlists and, when one is selected, that playlist’s tracks.
 */
export function useSpotifyPlaylistsView({
  API_BASE,
  accessToken,
  spotifyToken,
  viewListId,
  authFetch,
}: {
  API_BASE: string;
  accessToken: string | null;
  spotifyToken: string | null;
  viewListId: string | number | null;
  authFetch: AuthFetchFn;
}) {
  const [spotifyPlaylists, setSpotifyPlaylists] = useState<SpotifyPlaylistRow[]>([]);
  const [spotifyPlaylistsLoading, setSpotifyPlaylistsLoading] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [playlistTracksData, setPlaylistTracksData] = useState<PlaylistTracksData | null>(null);
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
    authFetchRef
      .current(`${API_BASE}/api/spotify/playlists/`, {
        headers: { Authorization: `Bearer ${spotifyToken}` },
      })
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data: { playlists?: SpotifyPlaylistRow[] } | null) => {
        if (!cancelled && data) setSpotifyPlaylists(data.playlists || []);
      })
      .catch((err: unknown) => {
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
    authFetchRef
      .current(`${API_BASE}/api/spotify/playlists/${selectedPlaylistId}/tracks/`, {
        headers: { Authorization: `Bearer ${spotifyToken}` },
      })
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data: PlaylistTracksData | null) => {
        if (!cancelled && data) setPlaylistTracksData(data);
      })
      .catch((err: unknown) => {
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
