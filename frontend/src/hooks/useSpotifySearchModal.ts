import type { Dispatch, FormEvent, SetStateAction } from "react";
import { useState } from "react";
import { manualSpotifyMatchUrl } from "../services/searchApi";
import type { DetailData, DetailItem, SpotifyMatchRow, SpotifyTrackRef } from "../types/musicDbSlices";
import { catalogOrDiscogsTitle } from "../utils/spotifyTrackMatch";

type AuthFetch = (input: string, init?: RequestInit) => Promise<Response>;

interface UseSpotifySearchModalParams {
  API_BASE: string;
  authFetch: AuthFetch;
  detailData: DetailData | null;
  selectedItem: DetailItem | null;
  setSpotifyMatches: Dispatch<SetStateAction<SpotifyMatchRow[]>>;
}

export function useSpotifySearchModal({
  API_BASE,
  authFetch,
  detailData,
  selectedItem,
  setSpotifyMatches,
}: UseSpotifySearchModalParams) {
  const [showSpotifySearchModal, setShowSpotifySearchModal] = useState(false);
  const [manualMatchTrackTitle, setManualMatchTrackTitle] = useState<string | null>(null);
  const [spotifySearchQuery, setSpotifySearchQuery] = useState("");
  const [spotifySearchArtist, setSpotifySearchArtist] = useState("");
  const [spotifySearchAlbum, setSpotifySearchAlbum] = useState("");
  const [spotifySearchResults, setSpotifySearchResults] = useState<SpotifyTrackRef[]>([]);
  const [spotifySearchLoading, setSpotifySearchLoading] = useState(false);
  const [spotifySearchFetched, setSpotifySearchFetched] = useState(false);

  function openSpotifySearchModal(catalogTrackTitle: unknown) {
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

  async function handleSpotifySearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = spotifySearchQuery.trim();
    if (!q) return;
    setSpotifySearchLoading(true);
    setSpotifySearchResults([]);
    setSpotifySearchFetched(false);
    try {
      const params = new URLSearchParams({ q });
      const artist = spotifySearchArtist.trim();
      if (artist) params.set("artist", artist);
      const album = spotifySearchAlbum.trim();
      if (album) params.set("album", album);
      params.set("limit", "15");
      const res = await authFetch(`${API_BASE}/api/spotify/search/?${params}`);
      const data = (await res.json()) as { tracks?: SpotifyTrackRef[] };
      if (res.ok) setSpotifySearchResults(data.tracks || []);
      else setSpotifySearchResults([]);
    } catch {
      setSpotifySearchResults([]);
    } finally {
      setSpotifySearchLoading(false);
      setSpotifySearchFetched(true);
    }
  }

  async function handleSelectSpotifyTrack(track: SpotifyTrackRef) {
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
          catalogOrDiscogsTitle(m) === manualMatchTrackTitle
            ? { ...m, spotify_track: track, manual_match: true }
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
