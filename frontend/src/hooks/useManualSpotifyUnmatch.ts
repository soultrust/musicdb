import { useState, useCallback } from "react";
import { manualSpotifyMatchDeleteUrl } from "../services/searchApi";
import {
  findSpotifyMatchForTrackTitle,
  isManualSpotifyMatchRow,
} from "../utils/spotifyTrackMatch";

/**
 * Manual-match Spotify row: green search control opens confirm to DELETE the link;
 * otherwise the search modal opens.
 */
export function useManualSpotifyUnmatch({
  API_BASE,
  authFetch,
  selectedItem,
  spotifyMatches,
  openSpotifySearchModal,
  refreshSpotifyMatches,
}) {
  const [unmatchSpotifyTrackTitle, setUnmatchSpotifyTrackTitle] = useState(null);
  const [unmatchSpotifyLoading, setUnmatchSpotifyLoading] = useState(false);

  const handleSpotifySearchButtonClick = useCallback(
    (trackTitle) => {
      const m = findSpotifyMatchForTrackTitle(spotifyMatches, trackTitle);
      if (isManualSpotifyMatchRow(m)) {
        setUnmatchSpotifyTrackTitle(trackTitle);
      } else {
        openSpotifySearchModal(trackTitle);
      }
    },
    [spotifyMatches, openSpotifySearchModal],
  );

  const closeUnmatchSpotifyConfirm = useCallback(() => setUnmatchSpotifyTrackTitle(null), []);

  const confirmUnmatchSpotify = useCallback(async () => {
    if (!unmatchSpotifyTrackTitle || !selectedItem?.id) return;
    setUnmatchSpotifyLoading(true);
    try {
      const res = await authFetch(
        manualSpotifyMatchDeleteUrl(API_BASE, selectedItem.id, unmatchSpotifyTrackTitle),
        { method: "DELETE" },
      );
      if (res.ok || res.status === 204) {
        setUnmatchSpotifyTrackTitle(null);
        await refreshSpotifyMatches();
      }
    } catch (err) {
      console.error("Failed to remove manual Spotify match:", err);
    } finally {
      setUnmatchSpotifyLoading(false);
    }
  }, [API_BASE, authFetch, unmatchSpotifyTrackTitle, selectedItem, refreshSpotifyMatches]);

  return {
    unmatchSpotifyTrackTitle,
    unmatchSpotifyLoading,
    handleSpotifySearchButtonClick,
    closeUnmatchSpotifyConfirm,
    confirmUnmatchSpotify,
  };
}
