import { useCallback, useState } from "react";
import { matchTracksToSpotifyApi } from "../services/trackMatchingApi";

/**
 * Spotify match rows for the current detail release + loading flag for match / refresh.
 */
export function useSpotifyMatchSync({ API_BASE, authFetch, detailData, selectedItem }) {
  const [spotifyMatches, setSpotifyMatches] = useState([]);
  const [spotifyMatching, setSpotifyMatching] = useState(false);

  const refreshSpotifyMatches = useCallback(async () => {
    if (!detailData?.tracklist?.length || !detailData.artists?.length || !selectedItem?.id) return;
    setSpotifyMatching(true);
    try {
      const matches = await matchTracksToSpotifyApi({
        authFetch,
        API_BASE,
        tracklist: detailData.tracklist,
        artists: detailData.artists,
        releaseId: selectedItem.id,
      });
      setSpotifyMatches(matches);
    } catch (err) {
      console.error("Failed to refresh Spotify matches:", err);
    } finally {
      setSpotifyMatching(false);
    }
  }, [API_BASE, authFetch, detailData, selectedItem]);

  return {
    spotifyMatches,
    setSpotifyMatches,
    spotifyMatching,
    setSpotifyMatching,
    refreshSpotifyMatches,
  };
}
