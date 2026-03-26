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
import { API_BASE, AUTH_REFRESH_KEY, SPOTIFY_CLIENT_ID, SPOTIFY_REDIRECT_URI } from "./config";

console.log("API_BASE being used:", API_BASE);

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

  const { handleItemClick: handleItemClickInternal } = useDetailController({
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

  async function handleItemClick(item) {
    return handleItemClickInternal(item);
  }

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

  

  // Defer album art load until detail panel has painted (avoids flaky loads) and enable retry on error
  useEffect(() => {
    if (!detailData || detailLoading) return;
    const id = requestAnimationFrame(() => setAlbumArtReady(true));
    return () => cancelAnimationFrame(id);
  }, [detailData, detailLoading]);

  // Removed consumed list loading - replaced with lists feature

  async function handleSubmit(e) {
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
      const searchRes = await authFetch(`${API_BASE}/api/search/?${params.toString()}`);
      const data = await searchRes.json();
      if (!searchRes.ok) {
        setError(data.error || `Request failed: ${searchRes.status}`);
        return;
      }
      setResults(data.results || []);
      setViewListId(null); /* switch to search results when searching */
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
  }

  // handleItemClick is now provided by useDetailController


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
    <div className="app">
      <AppHeader
        spotifyToken={spotifyToken}
        spotifyConnectionStatus={spotifyConnectionStatus}
        deviceId={deviceId}
        isPlaying={isPlaying}
        currentTrack={currentTrack}
        togglePlayback={togglePlayback}
        handleSpotifyLogin={handleSpotifyLogin}
        viewListId={viewListId}
        onViewListChange={resetOnViewSwitch}
        allListsForView={allListsForView}
        logout={logout}
      />
      <div className="content">
        <SearchSidebar
          handleSubmit={handleSubmit}
          searchType={searchType}
          setSearchType={setSearchType}
          query={query}
          setQuery={setQuery}
          loading={loading}
          viewListId={viewListId}
          filterArtist={filterArtist}
          setFilterArtist={setFilterArtist}
          filterYear={filterYear}
          setFilterYear={setFilterYear}
          filterYearFrom={filterYearFrom}
          setFilterYearFrom={setFilterYearFrom}
          filterYearTo={filterYearTo}
          setFilterYearTo={setFilterYearTo}
          allowDigitsOnly={allowDigitsOnly}
          error={error}
          spotifyPlaylistsLoading={spotifyPlaylistsLoading}
          spotifyToken={spotifyToken}
          spotifyPlaylists={spotifyPlaylists}
          selectedPlaylistId={selectedPlaylistId}
          setSelectedPlaylistId={setSelectedPlaylistId}
          setSelectedItem={setSelectedItem}
          setDetailData={setDetailData}
          listViewData={listViewData}
          listViewLoading={listViewLoading}
          handleItemClick={handleItemClick}
          results={results}
          selectedItem={selectedItem}
        />
        {selectedPlaylistId && playlistTracksData ? (
          <PlaylistDetail
            playlistTracksLoading={playlistTracksLoading}
            playlistTracksData={playlistTracksData}
            deviceId={deviceId}
            spotifyToken={spotifyToken}
            playTrack={playTrack}
          />
        ) : (
          selectedItem && (
            <SelectedItemDetail
              detailLoading={detailLoading}
              detailData={detailData}
              selectedItem={selectedItem}
              albumArtReady={albumArtReady}
              albumArtRetryKey={albumArtRetryKey}
              setAlbumArtRetryKey={setAlbumArtRetryKey}
              handleAddToList={handleAddToList}
              spotifyMatching={spotifyMatching}
              autoplay={autoplay}
              setAutoplay={setAutoplay}
              tracklistFilter={tracklistFilter}
              setTracklistFilter={setTracklistFilter}
              getDisplayLikeState={getDisplayLikeState}
              spotifyMatches={spotifyMatches}
              currentTrack={currentTrack}
              playbackDuration={playbackDuration}
              playbackPosition={playbackPosition}
              getTrackKey={getTrackKey}
              handleTrackRowClick={handleTrackRowClick}
              playTrack={playTrack}
              openSpotifySearchModal={openSpotifySearchModal}
              toggleLikeTrack={toggleLikeTrack}
              spotifyToken={spotifyToken}
              overviewLoading={overviewLoading}
              overview={overview}
              overviewError={overviewError}
            />
          )
        )}
      </div>
      {showListModal && (
        <ListModal
          listLoading={listLoading}
          lists={lists}
          selectedListIds={selectedListIds}
          toggleListSelection={toggleListSelection}
          handleCreateList={handleCreateList}
          newListName={newListName}
          setNewListName={setNewListName}
          listError={listError}
          handleAddToLists={handleAddToLists}
          handleCloseListModal={handleCloseListModal}
        />
      )}
      {showSpotifySearchModal && (
        <SpotifySearchModal
          closeSpotifySearchModal={closeSpotifySearchModal}
          handleSpotifySearch={handleSpotifySearch}
          spotifySearchQuery={spotifySearchQuery}
          setSpotifySearchQuery={setSpotifySearchQuery}
          spotifySearchLoading={spotifySearchLoading}
          spotifySearchResults={spotifySearchResults}
          handleSelectSpotifyTrack={handleSelectSpotifyTrack}
          spotifySearchFetched={spotifySearchFetched}
        />
      )}
    </div>
  );
}

export default App;
