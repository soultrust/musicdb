import { useState, useEffect, useCallback } from "react";
import "./App.css";
import { authFetchWithRefresh } from "./services/authFetch";
import AuthGate from "./components/AuthGate";
import AppHeader from "./components/AppHeader";
import ListModal from "./components/ListModal";
import SpotifySearchModal from "./components/SpotifySearchModal";
import SearchSidebar from "./components/SearchSidebar";
import PlaylistDetail from "./components/PlaylistDetail";
import SelectedItemDetail from "./components/SelectedItemDetail";
import { useAuth } from "./hooks/useAuth";
import { useSearchState } from "./hooks/useSearchState";
import { useLists } from "./hooks/useLists";
import { useLikedTracks } from "./hooks/useLikedTracks";
import { useSpotifyPlayer } from "./hooks/useSpotifyPlayer";
import { useSpotifyAuth } from "./hooks/useSpotifyAuth";
import { useSpotifySearchModal } from "./hooks/useSpotifySearchModal";
import { useDetailController } from "./hooks/useDetailController";
import { useViewSwitchReset } from "./hooks/useViewSwitchReset";
import { useSearchSubmit } from "./hooks/useSearchSubmit";
import { useAppContextValue } from "./hooks/useAppContextValue";
import { MusicDbAppProvider } from "./context/MusicDbAppProvider";
import { API_BASE, AUTH_REFRESH_KEY, SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI } from "./config";

function App() {
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
    onLogoutExtra: () => handleSpotifyLogout(),
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
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [, setDetailError] = useState(null);
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState(null);
  const [spotifyMatches, setSpotifyMatches] = useState([]);
  const [spotifyMatching, setSpotifyMatching] = useState(false);
  const [spotifyToken, setSpotifyToken] = useState(null);
  // Album art: deferred until detail panel has painted, with retry on load error
  const [albumArtReady, setAlbumArtReady] = useState(false);
  const [albumArtRetryKey, setAlbumArtRetryKey] = useState(0);
  // Spotify playlists + lists state moved into useLists

  const authFetch = useCallback(
    (url, options = {}) =>
      authFetchWithRefresh(url, options, {
        API_BASE,
        AUTH_REFRESH_KEY,
        accessToken,
        setAccessToken,
        logout,
      }),
    [accessToken, logout, setAccessToken],
  );

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

  const { handleItemClick } = useDetailController({
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

  const resetOnViewSwitch = useViewSwitchReset({
    setViewListId,
    setListViewData,
    setSelectedItem,
    setDetailData,
    setSelectedPlaylistId,
    setPlaylistTracksData,
  });

  const handleSubmit = useSearchSubmit({
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
  });

  const { handleSpotifyLogin } = useSpotifyAuth({
    API_BASE,
    SPOTIFY_CLIENT_ID,
    SPOTIFY_REDIRECT_URI,
    setSpotifyToken,
    resetPlayerState,
  });

  const {
    showSpotifySearchModal,
    spotifySearchQuery,
    setSpotifySearchQuery,
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

  const musicDbAppValue = useAppContextValue({
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
    spotifySearchQuery,
    setSpotifySearchQuery,
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
    openSpotifySearchModal,
    toggleLikeTrack,
    overviewLoading,
    overview,
    overviewError,
  });

  // Defer album art load until detail panel has painted (avoids flaky loads) and enable retry on error
  useEffect(() => {
    if (!detailData || detailLoading) return;
    const id = requestAnimationFrame(() => setAlbumArtReady(true));
    return () => cancelAnimationFrame(id);
  }, [detailData, detailLoading]);

  function handleSpotifyLogout() {
    setSpotifyToken(null);
    resetPlayerState();
    window.location.hash = "";
  }
  if (!accessToken) {
    return (
      <AuthGate
        authMode={authMode}
        authEmail={authEmail}
        authPassword={authPassword}
        authLoading={authLoading}
        authError={authError}
        onSubmit={handleAuthSubmit}
        onChangeEmail={(e) => setAuthEmail(e.target.value)}
        onChangePassword={(e) => setAuthPassword(e.target.value)}
        onToggleAuthMode={() => {
          setAuthMode((m) => (m === "login" ? "register" : "login"));
          setAuthError(null);
        }}
      />
    );
  }

  return (
    <MusicDbAppProvider value={musicDbAppValue}>
      <div className="app">
        <AppHeader />
        <div className="content">
          <SearchSidebar />
          {selectedPlaylistId && playlistTracksData ? (
            <PlaylistDetail />
          ) : (
            selectedItem && <SelectedItemDetail />
          )}
        </div>
        {showListModal && <ListModal />}
        {showSpotifySearchModal && <SpotifySearchModal />}
      </div>
    </MusicDbAppProvider>
  );
}

export default App;
