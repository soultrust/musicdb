import type { Dispatch, FormEvent, SetStateAction } from "react";
import { useCallback } from "react";
import { searchQueryUrl } from "../services/searchApi";
import type { AuthFetchFn } from "../services/especiallyLikedApi";
import type { DetailData, DetailItem, SearchResultItem, SpotifyMatchRow } from "../types/musicDbSlices";

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function useSearchSubmit({
  API_BASE,
  authFetch,
  query,
  searchType,
  filterArtist,
  filterYear,
  setLoading,
  setError,
  setResults,
  setViewListId,
  handleItemClick,
  setSelectedItem,
  setDetailData,
  setSpotifyMatches,
}: {
  API_BASE: string;
  authFetch: AuthFetchFn;
  query: string;
  searchType: string;
  filterArtist: string;
  filterYear: string;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setResults: Dispatch<SetStateAction<SearchResultItem[]>>;
  setViewListId: Dispatch<SetStateAction<string | number | null>>;
  handleItemClick: (item: SearchResultItem) => void | Promise<void>;
  setSelectedItem: Dispatch<SetStateAction<DetailItem | null>>;
  setDetailData: Dispatch<SetStateAction<DetailData | null>>;
  setSpotifyMatches: Dispatch<SetStateAction<SpotifyMatchRow[]>>;
}) {
  return useCallback(
    async (e?: FormEvent<Element>) => {
      e?.preventDefault();
      if (!query.trim()) return;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          q: query.trim(),
          type: searchType,
        });
        if (searchType === "album") {
          if (filterArtist.trim()) params.set("artist", filterArtist.trim());
          if (filterYear.trim()) params.set("year", filterYear.trim());
        }
        const searchRes = await authFetch(searchQueryUrl(API_BASE, params));
        const data = (await searchRes.json()) as { error?: string; results?: SearchResultItem[] };
        if (!searchRes.ok) {
          setError(data.error || `Request failed: ${searchRes.status}`);
          return;
        }
        setResults(data.results || []);
        setViewListId(null);
        if (data.results?.length) {
          const first = data.results[0];
          requestAnimationFrame(() => {
            void handleItemClick(first);
          });
        } else {
          setSelectedItem(null);
          setDetailData(null);
          setSpotifyMatches([]);
        }
      } catch (err: unknown) {
        setError(errorMessage(err, "Request failed"));
      } finally {
        setLoading(false);
      }
    },
    [
      API_BASE,
      authFetch,
      query,
      searchType,
      filterArtist,
      filterYear,
      setLoading,
      setError,
      setResults,
      setViewListId,
      handleItemClick,
      setSelectedItem,
      setDetailData,
      setSpotifyMatches,
    ],
  );
}
