import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { DetailData, DetailItem, SearchResultItem } from "../types/musicDbSlices";
import { authFetchWithRefresh } from "../services/authFetch";
import { useAuth } from "./useAuth";
import { useSearchState } from "./useSearchState";
import { useLists } from "./useLists";
import { useLikedTracks } from "./useLikedTracks";
import { useSpotifyPlayer } from "./useSpotifyPlayer";
import { useSpotifyAuth } from "./useSpotifyAuth";
import { useSpotifySearchModal } from "./useSpotifySearchModal";
import { useDetailController } from "./useDetailController";
import { useViewSwitchReset } from "./useViewSwitchReset";
import { useSearchSubmit } from "./useSearchSubmit";
import { useAppContextSlices } from "./useAppContextSlices";
import { useManualSpotifyUnmatch } from "./useManualSpotifyUnmatch";
import { useSpotifyMatchSync } from "./useSpotifyMatchSync";
import { useAlbumArtReveal } from "./useAlbumArtReveal";
import { useSpotifyTokenRefresh } from "./useSpotifyTokenRefresh";

const ITEM_ROUTE_RE = /^\/(artist|album|song)\/(.+)$/;
const PLAYLIST_ROUTE_RE = /^\/playlist\/(.+)$/;

/**
 * Wires all authenticated-app hooks: search, detail, lists, Spotify, likes, context value.
 * Keeps `App.jsx` focused on layout and the auth gate.
 */
export function useMusicDbAppState({
  API_BASE,
  AUTH_REFRESH_KEY,
  SPOTIFY_CLIENT_ID,
  SPOTIFY_REDIRECT_URI,
}: {
  API_BASE: string;
  AUTH_REFRESH_KEY: string;
  SPOTIFY_CLIENT_ID: string;
  SPOTIFY_REDIRECT_URI: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const isProgrammaticNavRef = useRef(false);
  const resetPlayerStateRef = useRef<() => void>(() => {});

  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<DetailItem | null>(null);
  const [detailData, setDetailData] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [, setDetailError] = useState<string | null>(null);
  const [overview, setOverview] = useState<string | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const [albumArtReady, setAlbumArtReady] = useState(false);
  const [albumArtRetryKey, setAlbumArtRetryKey] = useState(0);

  const handleSpotifyLogout = useCallback(() => {
    setSpotifyToken(null);
    resetPlayerStateRef.current();
    window.location.hash = "";
  }, []);

  const {
    accessToken,
    setAccessToken,
    authError,
    setAuthError,
    authMode,
    setAuthMode,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    authLoading,
    handleAuthSubmit,
    logout,
  } = useAuth({
    API_BASE,
    AUTH_REFRESH_KEY,
    onLogoutExtra: handleSpotifyLogout,
  });

  const {
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
  } = useSearchState();

  const authFetch = useCallback(
    (url: string, options: RequestInit = {}) =>
      authFetchWithRefresh(url, options, {
        API_BASE,
        AUTH_REFRESH_KEY,
        accessToken,
        setAccessToken,
        logout,
      }),
    [API_BASE, AUTH_REFRESH_KEY, accessToken, logout, setAccessToken],
  );

  const {
    refreshSpotifyToken,
    handleTokenReceived,
    isTokenFresh,
  } = useSpotifyTokenRefresh({ API_BASE, authFetch, spotifyToken, setSpotifyToken });

  const {
    spotifyMatches,
    setSpotifyMatches,
    spotifyMatching,
    setSpotifyMatching,
    refreshSpotifyMatches,
  } = useSpotifyMatchSync({ API_BASE, authFetch, detailData, selectedItem });

  const {
    getTrackKey,
    tracklistFilter,
    setTracklistFilter,
    getDisplayLikeState,
    toggleLikeTrack,
    visibleTracklist,
    isTrackVisible,
    syncEspeciallyLikedForItem,
  } = useLikedTracks({
    API_BASE,
    authFetch,
    accessToken,
    selectedItem,
    detailData,
    spotifyMatches,
    spotifyToken,
  });

  const { handleItemClick: fetchItemDetail } = useDetailController({
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
  });

  const handleItemClick = useCallback(
    async (item: SearchResultItem) => {
      const type = item.type || "album";
      isProgrammaticNavRef.current = true;
      navigate(`/${encodeURIComponent(type)}/${encodeURIComponent(item.id)}`);
      await fetchItemDetail(item);
    },
    [navigate, fetchItemDetail],
  );

  const refreshDetail = useCallback(async () => {
    if (!selectedItem?.id || !selectedItem?.type) return;
    await fetchItemDetail(selectedItem as SearchResultItem);
  }, [selectedItem, fetchItemDetail]);

  const {
    showListModal,
    lists,
    selectedListIds,
    newListName,
    setNewListName,
    listLoading,
    listError,
    allListsForView,
    viewListId,
    setViewListId,
    listViewData,
    setListViewData,
    listViewLoading,
    spotifyPlaylists,
    spotifyPlaylistsLoading,
    selectedPlaylistId,
    setSelectedPlaylistId,
    playlistTracksData,
    setPlaylistTracksData,
    playlistTracksLoading,
    handleAddToList,
    handleCloseListModal,
    toggleListSelection,
    handleCreateList,
    handleAddToLists,
  } = useLists({
    API_BASE,
    authFetch,
    accessToken,
    spotifyToken,
    selectedItem,
    detailData,
    handleItemClick,
  });

  const resetOnViewSwitchRaw = useViewSwitchReset({
    setViewListId,
    setListViewData,
    setSelectedItem,
    setDetailData,
    setSelectedPlaylistId,
    setPlaylistTracksData,
  });

  const resetOnViewSwitch = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      isProgrammaticNavRef.current = true;
      navigate("/");
      resetOnViewSwitchRaw(e);
    },
    [navigate, resetOnViewSwitchRaw],
  );

  const handlePlaylistClick = useCallback(
    (playlistId: string) => {
      isProgrammaticNavRef.current = true;
      navigate(`/playlist/${encodeURIComponent(playlistId)}`);
      setSelectedPlaylistId(playlistId);
      setSelectedItem(null);
      setDetailData(null);
    },
    [navigate, setSelectedPlaylistId, setSelectedItem, setDetailData],
  );

  // Sync URL → app state for bookmarks, back/forward, and direct URL entry.
  useEffect(() => {
    if (isProgrammaticNavRef.current) {
      isProgrammaticNavRef.current = false;
      return;
    }
    const path = location.pathname;

    const itemMatch = path.match(ITEM_ROUTE_RE);
    if (itemMatch) {
      const type = itemMatch[1];
      const id = decodeURIComponent(itemMatch[2]);
      setSelectedPlaylistId(null);
      setPlaylistTracksData(null);
      void fetchItemDetail({ type, id, title: "" });
      return;
    }

    const playlistMatch = path.match(PLAYLIST_ROUTE_RE);
    if (playlistMatch) {
      const pid = decodeURIComponent(playlistMatch[1]);
      setSelectedItem(null);
      setDetailData(null);
      setSelectedPlaylistId(pid);
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleSubmit = useSearchSubmit({
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
  });

  const {
    spotifyConnectionStatus,
    deviceId,
    isPlaying,
    currentTrack,
    playbackPosition,
    playbackDuration,
    autoplay,
    setAutoplay,
    playTrack,
    togglePlayback,
    handleTrackRowClick,
    resetPlayerState,
  } = useSpotifyPlayer({
    spotifyToken,
    detailData,
    spotifyMatches,
    visibleTracklist,
    isTrackVisible,
    tracklistFilter,
    refreshSpotifyToken,
    isTokenFresh,
  });

  useEffect(() => {
    resetPlayerStateRef.current = resetPlayerState;
  }, [resetPlayerState]);

  const { handleSpotifyLogin } = useSpotifyAuth({
    API_BASE,
    SPOTIFY_CLIENT_ID,
    SPOTIFY_REDIRECT_URI,
    setSpotifyToken,
    resetPlayerState,
    handleTokenReceived,
  });

  const {
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
  } = useSpotifySearchModal({
    API_BASE,
    authFetch,
    detailData,
    selectedItem,
    setSpotifyMatches,
  });

  const {
    unmatchSpotifyTrackTitle,
    unmatchSpotifyLoading,
    handleSpotifySearchButtonClick,
    closeUnmatchSpotifyConfirm,
    confirmUnmatchSpotify,
  } = useManualSpotifyUnmatch({
    API_BASE,
    authFetch,
    selectedItem,
    spotifyMatches,
    openSpotifySearchModal,
    refreshSpotifyMatches,
  });

  const musicDbAppSlices = useAppContextSlices({
    spotifyToken,
    spotifyConnectionStatus,
    deviceId,
    isPlaying,
    currentTrack,
    togglePlayback,
    handleSpotifyLogin,
    viewListId,
    resetOnViewSwitch,
    allListsForView,
    logout,
    handleSubmit,
    searchType,
    setSearchType,
    query,
    setQuery,
    loading,
    filterArtist,
    setFilterArtist,
    filterYear,
    setFilterYear,
    filterYearFrom,
    setFilterYearFrom,
    filterYearTo,
    setFilterYearTo,
    allowDigitsOnly,
    error,
    spotifyPlaylistsLoading,
    spotifyPlaylists,
    selectedPlaylistId,
    setSelectedPlaylistId,
    handlePlaylistClick,
    setSelectedItem,
    setDetailData,
    listViewData,
    listViewLoading,
    handleItemClick,
    results,
    selectedItem,
    playlistTracksLoading,
    playlistTracksData,
    playTrack,
    listLoading,
    lists,
    selectedListIds,
    toggleListSelection,
    handleCreateList,
    newListName,
    setNewListName,
    listError,
    handleAddToLists,
    handleCloseListModal,
    closeSpotifySearchModal,
    handleSpotifySearch,
    manualMatchTrackTitle,
    spotifySearchQuery,
    setSpotifySearchQuery,
    spotifySearchArtist,
    setSpotifySearchArtist,
    spotifySearchAlbum,
    setSpotifySearchAlbum,
    spotifySearchLoading,
    spotifySearchResults,
    handleSelectSpotifyTrack,
    spotifySearchFetched,
    detailLoading,
    detailData,
    albumArtReady,
    albumArtRetryKey,
    setAlbumArtRetryKey,
    handleAddToList,
    spotifyMatching,
    autoplay,
    setAutoplay,
    tracklistFilter,
    setTracklistFilter,
    getDisplayLikeState,
    spotifyMatches,
    playbackDuration,
    playbackPosition,
    getTrackKey,
    handleTrackRowClick,
    handleSpotifySearchButtonClick,
    toggleLikeTrack,
    overviewLoading,
    overview,
    overviewError,
    API_BASE,
    authFetch,
    refreshDetail,
  });

  useAlbumArtReveal(detailData, detailLoading, setAlbumArtReady);

  return {
    accessToken,
    authMode,
    authEmail,
    authPassword,
    authLoading,
    authError,
    setAuthEmail,
    setAuthPassword,
    setAuthError,
    setAuthMode,
    handleAuthSubmit,
    musicDbAppSlices,
    showListModal,
    showSpotifySearchModal,
    manualMatchTrackTitle,
    unmatchSpotifyTrackTitle,
    closeUnmatchSpotifyConfirm,
    confirmUnmatchSpotify,
    unmatchSpotifyLoading,
    selectedPlaylistId,
    playlistTracksData,
    selectedItem,
  };
}
