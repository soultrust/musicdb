import { useState } from "react";

export function useSearchState() {
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState("album"); // "artist" | "album" | "song"
  const [filterYear, setFilterYear] = useState("");
  const [filterYearFrom, setFilterYearFrom] = useState("");
  const [filterYearTo, setFilterYearTo] = useState("");
  const [filterArtist, setFilterArtist] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function allowDigitsOnly(setter, maxLength = 4) {
    return (e) => {
      const v = e.target.value.replace(/\D/g, "").slice(0, maxLength);
      setter(v);
    };
  }

  return {
    query,
    setQuery,
    searchType,
    setSearchType,
    filterYear,
    setFilterYear,
    filterYearFrom,
    setFilterYearFrom,
    filterYearTo,
    setFilterYearTo,
    filterArtist,
    setFilterArtist,
    results,
    setResults,
    loading,
    setLoading,
    error,
    setError,
    allowDigitsOnly,
  };
}

