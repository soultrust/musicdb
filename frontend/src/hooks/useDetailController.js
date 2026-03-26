import { useCallback } from "react";
import { matchTracksToSpotifyApi } from "../services/trackMatchingApi";

export function useDetailController({
  API_BASE,
  authFetch,
  syncEspeciallyLikedForItem,

  setSelectedItem,
  setDetailData,
  setDetailLoading,
  setDetailError,
  setOverview,
  setOverviewLoading,
  setOverviewError,

  setAlbumArtReady,
  setAlbumArtRetryKey,

  setSpotifyMatches,
  setSpotifyMatching,
}) {
  const handleItemClick = useCallback(
    async (item) => {
      setSelectedItem(item);
      setDetailData(null);
      setDetailError(null);
      setOverview(null);
      setOverviewError(null);
      setAlbumArtReady(false);
      setAlbumArtRetryKey(0);

      if (!item?.id || !item?.type) {
        setDetailError("Item missing id or type");
        return;
      }

      setDetailLoading(true);
      try {
        const res = await authFetch(
          `${API_BASE}/api/search/detail/?type=${encodeURIComponent(item.type)}&id=${encodeURIComponent(item.id)}`,
        );
        const data = await res.json();

        if (!res.ok) {
          setDetailError(data.error || `Request failed: ${res.status}`);
          return;
        }

        setDetailData(data);

        await syncEspeciallyLikedForItem(item, data);

        // If it's a release with tracks, match them to Spotify
        if (data.tracklist && data.tracklist.length > 0 && data.artists) {
          setSpotifyMatching(true);
          try {
            const matches = await matchTracksToSpotifyApi({
              authFetch,
              API_BASE,
              tracklist: data.tracklist,
              artists: data.artists,
              releaseId: item?.id,
            });
            setSpotifyMatches(matches);
          } catch (err) {
            // Keep UI responsive; spotify matching is best-effort.
            console.error("Failed to match tracks:", err);
          } finally {
            setSpotifyMatching(false);
          }
        }

        // Fetch album overview only for album/release types (cache or Wikipedia)
        const isAlbumType =
          item.type === "release" || item.type === "master" || item.type === "album";
        const album = data.title || "";
        const artist = data.artists?.length ? data.artists.map((a) => a.name).join(", ") : "";

        if (isAlbumType && album && artist) {
          setOverviewLoading(true);
          setOverviewError(null);
          try {
            const ovRes = await authFetch(
              `${API_BASE}/api/search/album-overview/?album=${encodeURIComponent(
                album,
              )}&artist=${encodeURIComponent(artist)}`,
            );
            const text = await ovRes.text();

            if (text.trim().startsWith("<")) {
              setOverviewError("Overview unavailable (server error). Is the Django API running?");
            } else {
              try {
                const ovData = JSON.parse(text);
                if (ovRes.ok && ovData?.data?.overview) {
                  setOverview(ovData.data.overview);
                } else if (!ovRes.ok && ovData?.error) {
                  setOverviewError(ovData.error);
                }
              } catch {
                setOverviewError("Could not load overview.");
              }
            }
          } catch (err) {
            setOverviewError(err.message || "Failed to load overview");
          } finally {
            setOverviewLoading(false);
          }
        }
      } catch (err) {
        setDetailError(err.message || "Request failed");
      } finally {
        setDetailLoading(false);
      }
    },
    [
      API_BASE,
      authFetch,
      setAlbumArtReady,
      setAlbumArtRetryKey,
      setDetailData,
      setDetailError,
      setDetailLoading,
      setOverview,
      setOverviewError,
      setOverviewLoading,
      setSelectedItem,
      setSpotifyMatching,
      setSpotifyMatches,
      syncEspeciallyLikedForItem,
    ],
  );

  return { handleItemClick };
}

