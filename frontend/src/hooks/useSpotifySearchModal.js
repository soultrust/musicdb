import { useState } from "react";
import { manualSpotifyMatchUrl } from "../services/searchApi";

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
  const [spotifySearchArtist, setSpotifySearchArtist] = useState("");
  const [spotifySearchAlbum, setSpotifySearchAlbum] = useState("");
  const [spotifySearchResults, setSpotifySearchResults] = useState([]);
  const [spotifySearchLoading, setSpotifySearchLoading] = useState(false);
  const [spotifySearchFetched, setSpotifySearchFetched] = useState(false);

  function openSpotifySearchModal(catalogTrackTitle) {
    const title = String(catalogTrackTitle ?? "").trim();
    setManualMatchTrackTitle(title || null);
    setSpotifySearchQuery(title);
    const artist = String(detailData?.artists?.[0]?.name ?? "").trim();
    setSpotifySearchArtist(artist);
    const album = String(detailData?.title ?? "").trim();
    setSpotifySearchAlbum(album);
    setSpotifySearchResults([]);
    setSpotifySearchFetched(false);
    setShowSpotifySearchModal(true);
  }

  function closeSpotifySearchModal() {
    setShowSpotifySearchModal(false);
    setManualMatchTrackTitle(null);
    setSpotifySearchQuery("");
    setSpotifySearchArtist("");
    setSpotifySearchAlbum("");
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
      const params = new URLSearchParams({ q });
      // Omit artist/album when blank so Spotify searches all artists / all albums (no field filter).
      const artist = spotifySearchArtist.trim();
      if (artist) params.set("artist", artist);
      const album = spotifySearchAlbum.trim();
      if (album) params.set("album", album);
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
      await authFetch(manualSpotifyMatchUrl(API_BASE), {
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
          (m.catalog_title ?? m.discogs_title) === manualMatchTrackTitle
            ? { ...m, spotify_track: track }
            : m,
        ),
      );
    } catch (err) {
      console.error("Failed to save manual Spotify match:", err);
    }
    closeSpotifySearchModal();
  }

  return {
    showSpotifySearchModal,
    /** Catalog track title for this manual match (used when saving); search field is pre-filled from this. */
    manualMatchTrackTitle,
    spotifySearchQuery,
    setSpotifySearchQuery,
    spotifySearchArtist,
    setSpotifySearchArtist,
    spotifySearchAlbum,
    setSpotifySearchAlbum,
    spotifySearchResults,
    spotifySearchLoading,
    spotifySearchFetched,
    openSpotifySearchModal,
    closeSpotifySearchModal,
    handleSpotifySearch,
    handleSelectSpotifyTrack,
  };
}
