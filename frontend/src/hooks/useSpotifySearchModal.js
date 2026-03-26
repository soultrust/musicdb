import { useState } from "react";

export function useSpotifySearchModal({
  API_BASE,
  authFetch,
  detailData,
  selectedItem,
  setSpotifyMatches,
}) {
  const [showSpotifySearchModal, setShowSpotifySearchModal] = useState(false);
  const [manualMatchTrackTitle, setManualMatchTrackTitle] = useState(null);
  const [spotifySearchQuery, setSpotifySearchQuery] = useState("");
  const [spotifySearchResults, setSpotifySearchResults] = useState([]);
  const [spotifySearchLoading, setSpotifySearchLoading] = useState(false);
  const [spotifySearchFetched, setSpotifySearchFetched] = useState(false);

  function openSpotifySearchModal(catalogTrackTitle) {
    setManualMatchTrackTitle(catalogTrackTitle);
    setSpotifySearchQuery(catalogTrackTitle || "");
    setSpotifySearchResults([]);
    setSpotifySearchFetched(false);
    setShowSpotifySearchModal(true);
  }

  function closeSpotifySearchModal() {
    setShowSpotifySearchModal(false);
    setManualMatchTrackTitle(null);
    setSpotifySearchQuery("");
    setSpotifySearchResults([]);
    setSpotifySearchFetched(false);
  }

  async function handleSpotifySearch(e) {
    e.preventDefault();
    const q = spotifySearchQuery.trim();
    if (!q) return;
    setSpotifySearchLoading(true);
    setSpotifySearchResults([]);
    setSpotifySearchFetched(false);
    try {
      const artist = detailData?.artists?.[0]?.name;
      const params = new URLSearchParams({ q });
      if (artist) params.set("artist", artist);
      params.set("limit", "15");
      const res = await authFetch(`${API_BASE}/api/spotify/search/?${params}`);
      const data = await res.json();
      if (res.ok) setSpotifySearchResults(data.tracks || []);
      else setSpotifySearchResults([]);
    } catch {
      setSpotifySearchResults([]);
    } finally {
      setSpotifySearchLoading(false);
      setSpotifySearchFetched(true);
    }
  }

  async function handleSelectSpotifyTrack(track) {
    if (!manualMatchTrackTitle || !selectedItem?.id) return;
    try {
      await authFetch(`${API_BASE}/api/search/manual-spotify-match/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          release_id: selectedItem.id,
          track_title: manualMatchTrackTitle,
          spotify_track: {
            id: track.id,
            uri: track.uri,
            name: track.name,
            artists: track.artists || [],
          },
        }),
      });
      setSpotifyMatches((prev) =>
        prev.map((m) =>
          m.discogs_title === manualMatchTrackTitle ? { ...m, spotify_track: track } : m,
        ),
      );
    } catch (err) {
      console.error("Failed to save manual Spotify match:", err);
    }
    closeSpotifySearchModal();
  }

  return {
    showSpotifySearchModal,
    spotifySearchQuery,
    setSpotifySearchQuery,
    spotifySearchResults,
    spotifySearchLoading,
    spotifySearchFetched,
    openSpotifySearchModal,
    closeSpotifySearchModal,
    handleSpotifySearch,
    handleSelectSpotifyTrack,
  };
}
