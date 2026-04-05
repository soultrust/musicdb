import type { Dispatch, SetStateAction } from "react";
import { useCallback } from "react";
import { matchTracksToSpotifyApi } from "../services/trackMatchingApi";
import { albumOverviewUrl, detailUrl } from "../services/searchApi";
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
        // region agent log
        let _artistSyncT0 = 0;
        const _t0 = Date.now();
        if (item.type === "artist") {
          fetch("http://127.0.0.1:7803/ingest/8dc400b1-9b4e-4a75-92ea-5606cfc28d7e", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Debug-Session-Id": "c43793",
            },
            body: JSON.stringify({
              sessionId: "c43793",
              location: "useDetailController.ts:handleItemClick",
              message: "detail_fetch_start",
              data: { type: item.type, id: item.id },
              timestamp: Date.now(),
              hypothesisId: "C",
            }),
          }).catch(() => {});
        }
        // endregion
        const res = await authFetch(detailUrl(API_BASE, item.type, item.id));
        // region agent log
        if (item.type === "artist") {
          fetch("http://127.0.0.1:7803/ingest/8dc400b1-9b4e-4a75-92ea-5606cfc28d7e", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Debug-Session-Id": "c43793",
            },
            body: JSON.stringify({
              sessionId: "c43793",
              location: "useDetailController.ts:handleItemClick",
              message: "detail_fetch_response",
              data: {
                ms: Date.now() - _t0,
                ok: res.ok,
                status: res.status,
              },
              timestamp: Date.now(),
              hypothesisId: "C",
            }),
          }).catch(() => {});
        }
        // endregion
        const data = (await res.json()) as DetailData & { error?: string };

        if (!res.ok) {
          setDetailError(data.error || `Request failed: ${res.status}`);
          return;
        }

        setDetailData(data);

        // region agent log
        if (item.type === "artist") {
          _artistSyncT0 = Date.now();
          fetch("http://127.0.0.1:7803/ingest/8dc400b1-9b4e-4a75-92ea-5606cfc28d7e", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Debug-Session-Id": "c43793",
            },
            body: JSON.stringify({
              sessionId: "c43793",
              location: "useDetailController.ts:handleItemClick",
              message: "before_sync_especially_liked",
              data: { type: item.type },
              timestamp: Date.now(),
              hypothesisId: "D",
            }),
          }).catch(() => {});
        }
        // endregion
        await syncEspeciallyLikedForItem(item as DetailItem, data);
        // region agent log
        if (item.type === "artist") {
          fetch("http://127.0.0.1:7803/ingest/8dc400b1-9b4e-4a75-92ea-5606cfc28d7e", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Debug-Session-Id": "c43793",
            },
            body: JSON.stringify({
              sessionId: "c43793",
              location: "useDetailController.ts:handleItemClick",
              message: "after_sync_especially_liked",
              data: { ms: Date.now() - _artistSyncT0 },
              timestamp: Date.now(),
              hypothesisId: "D",
            }),
          }).catch(() => {});
        }
        // endregion

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

        // Fetch album overview only for album/release types (cache or Wikipedia)
        const isAlbumType =
          item.type === "release" || item.type === "master" || item.type === "album";
        const album = data.title || "";
        const artist = data.artists?.length
          ? data.artists.map((a: SpotifyArtist) => a.name).join(", ")
          : "";

        if (isAlbumType && album && artist) {
          setOverviewLoading(true);
          setOverviewError(null);
          try {
            const ovRes = await authFetch(albumOverviewUrl(API_BASE, album, artist));
            const text = await ovRes.text();

            if (text.trim().startsWith("<")) {
              setOverviewError("Overview unavailable (server error). Is the Django API running?");
            } else {
              try {
                const ovData = JSON.parse(text) as {
                  data?: { overview?: string };
                  error?: string;
                };
                if (ovRes.ok && ovData?.data?.overview) {
                  setOverview(ovData.data.overview);
                } else if (!ovRes.ok && ovData?.error) {
                  setOverviewError(ovData.error);
                }
              } catch {
                setOverviewError("Could not load overview.");
              }
            }
          } catch (err: unknown) {
            setOverviewError(errorMessage(err, "Failed to load overview"));
          } finally {
            setOverviewLoading(false);
          }
        }
      } catch (err: unknown) {
        // region agent log
        if (item.type === "artist") {
          fetch("http://127.0.0.1:7803/ingest/8dc400b1-9b4e-4a75-92ea-5606cfc28d7e", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Debug-Session-Id": "c43793",
            },
            body: JSON.stringify({
              sessionId: "c43793",
              location: "useDetailController.ts:handleItemClick",
              message: "detail_fetch_catch",
              data: { err: errorMessage(err, "unknown") },
              timestamp: Date.now(),
              hypothesisId: "E",
            }),
          }).catch(() => {});
        }
        // endregion
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
