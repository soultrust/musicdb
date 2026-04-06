import type { Dispatch, SetStateAction } from "react";
import { useCallback } from "react";
import { matchTracksToSpotifyApi } from "../services/trackMatchingApi";
import { artistOverviewUrl, detailUrl } from "../services/searchApi";
import type { AuthFetchFn } from "../services/especiallyLikedApi";
import type {
  DetailData,
  DetailItem,
  SearchResultItem,
  SpotifyArtist,
  SpotifyMatchRow,
} from "../types/musicDbSlices";

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

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
}: {
  API_BASE: string;
  authFetch: AuthFetchFn;
  syncEspeciallyLikedForItem: (item: DetailItem, data: DetailData) => void | Promise<void>;
  setSelectedItem: Dispatch<SetStateAction<DetailItem | null>>;
  setDetailData: Dispatch<SetStateAction<DetailData | null>>;
  setDetailLoading: Dispatch<SetStateAction<boolean>>;
  setDetailError: Dispatch<SetStateAction<string | null>>;
  setOverview: Dispatch<SetStateAction<string | null>>;
  setOverviewLoading: Dispatch<SetStateAction<boolean>>;
  setOverviewError: Dispatch<SetStateAction<string | null>>;
  setAlbumArtReady: Dispatch<SetStateAction<boolean>>;
  setAlbumArtRetryKey: Dispatch<SetStateAction<number>>;
  setSpotifyMatches: Dispatch<SetStateAction<SpotifyMatchRow[]>>;
  setSpotifyMatching: Dispatch<SetStateAction<boolean>>;
}) {
  const handleItemClick = useCallback(
    async (item: SearchResultItem) => {
      setSelectedItem(item as DetailItem);
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
        const res = await authFetch(detailUrl(API_BASE, item.type, item.id));
        const data = (await res.json()) as DetailData & { error?: string };

        if (!res.ok) {
          setDetailError(data.error || `Request failed: ${res.status}`);
          return;
        }

        setDetailData(data);

        if (item.type === "artist" && item.id) {
          setOverviewLoading(true);
          authFetch(artistOverviewUrl(API_BASE, item.id))
            .then(async (r) => {
              const body = (await r.json()) as { overview?: string | null; reason?: string; error?: string };
              if (!r.ok) {
                setOverviewError(body.error || `Overview request failed (${r.status})`);
              } else if (body.overview) {
                setOverview(body.overview);
              } else {
                setOverviewError("No Wikipedia overview found for this artist.");
              }
            })
            .catch(() => setOverviewError("Failed to load artist overview."))
            .finally(() => setOverviewLoading(false));
        }

        await syncEspeciallyLikedForItem(item as DetailItem, data);

        // If it's a release with tracks, match them to Spotify
        if (data.tracklist && data.tracklist.length > 0 && data.artists) {
          setSpotifyMatching(true);
          try {
            const matches = await matchTracksToSpotifyApi({
              authFetch,
              API_BASE,
              tracklist: data.tracklist,
              artists: data.artists as SpotifyArtist[],
              releaseId: (item as DetailItem)?.id,
            });
            setSpotifyMatches(matches);
          } catch (err) {
            // Keep UI responsive; spotify matching is best-effort.
            console.error("Failed to match tracks:", err);
          } finally {
            setSpotifyMatching(false);
          }
        }
      } catch (err: unknown) {
        setDetailError(errorMessage(err, "Request failed"));
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
