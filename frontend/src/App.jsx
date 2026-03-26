import { useState, useEffect } from "react";
import "./App.css";
import { authFetchWithRefresh } from "./services/authFetch";
import { matchTracksToSpotifyApi } from "./services/trackMatchingApi";
import AuthGate from "./components/AuthGate";
import AppHeader from "./components/AppHeader";
import TrackList from "./components/TrackList";
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

  const authFetch = (url, options = {}) =>
    authFetchWithRefresh(url, options, {
      API_BASE,
      AUTH_REFRESH_KEY,
      accessToken,
      setAccessToken,
      logout,
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

  async function handleItemClick(item) {
    setSelectedItem(item);
    setDetailData(null);
    setDetailError(null);
    setOverview(null);
    setOverviewError(null);
    setAlbumArtReady(false);
    setAlbumArtRetryKey(0);

    if (!item.id || !item.type) {
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
      // Removed consumed state

      await syncEspeciallyLikedForItem(item, data);

      // If it's a release with tracks, match them to Spotify
      if (data.tracklist && data.tracklist.length > 0 && data.artists) {
        matchTracksToSpotify(data.tracklist, data.artists, item?.id);
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
            `${API_BASE}/api/search/album-overview/?album=${encodeURIComponent(album)}&artist=${encodeURIComponent(artist)}`,
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
  }

  async function matchTracksToSpotify(tracklist, artists, releaseId) {
    setSpotifyMatching(true);
    try {
      const matches = await matchTracksToSpotifyApi({
        authFetch,
        API_BASE,
        tracklist,
        artists,
        releaseId,
      });
      setSpotifyMatches(matches);
    } catch (err) {
      console.error("Failed to match tracks:", err);
    } finally {
      setSpotifyMatching(false);
    }
  }


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
        onViewListChange={(e) => {
          const v = e.target.value;
          if (v === "") {
            setViewListId(null);
            setListViewData(null);
            setSelectedItem(null);
            setDetailData(null);
            setSelectedPlaylistId(null);
            setPlaylistTracksData(null);
          } else if (v === "spotify-playlists") {
            setViewListId("spotify-playlists");
            setListViewData(null);
            setSelectedItem(null);
            setDetailData(null);
            setSelectedPlaylistId(null);
            setPlaylistTracksData(null);
          } else {
            setViewListId(parseInt(v, 10));
            setSelectedItem(null);
            setDetailData(null);
            setSelectedPlaylistId(null);
            setPlaylistTracksData(null);
          }
        }}
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
