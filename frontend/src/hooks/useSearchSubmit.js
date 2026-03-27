import { useCallback } from "react";
import { searchQueryUrl } from "../services/searchApi";

export function useSearchSubmit({
  API_BASE,
  authFetch,
  query,
  searchType,
  filterArtist,
  filterYear,
  filterYearFrom,
  filterYearTo,
  setLoading,
  setError,
  setResults,
  setViewListId,
  handleItemClick,
  setSelectedItem,
  setDetailData,
  setSpotifyMatches,
}) {
  return useCallback(
    async (e) => {
      e.preventDefault();
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
          if (filterYearFrom.trim()) params.set("year_from", filterYearFrom.trim());
          if (filterYearTo.trim()) params.set("year_to", filterYearTo.trim());
        }
        const searchRes = await authFetch(searchQueryUrl(API_BASE, params));
        const data = await searchRes.json();
        if (!searchRes.ok) {
          setError(data.error || `Request failed: ${searchRes.status}`);
          return;
        }
        setResults(data.results || []);
        setViewListId(null);
        if (data.results?.length) {
          const first = data.results[0];
          requestAnimationFrame(() => handleItemClick(first));
        } else {
          setSelectedItem(null);
          setDetailData(null);
          setSpotifyMatches([]);
        }
      } catch (err) {
        setError(err.message || "Request failed");
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
      filterYearFrom,
      filterYearTo,
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
