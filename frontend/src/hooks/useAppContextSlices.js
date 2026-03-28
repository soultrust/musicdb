import { useMemo } from "react";

function buildHeaderContext(args) {
  return {
    spotifyToken: args.spotifyToken,
    spotifyConnectionStatus: args.spotifyConnectionStatus,
    deviceId: args.deviceId,
    isPlaying: args.isPlaying,
    currentTrack: args.currentTrack,
    togglePlayback: args.togglePlayback,
    handleSpotifyLogin: args.handleSpotifyLogin,
    viewListId: args.viewListId,
    onViewListChange: args.resetOnViewSwitch,
    allListsForView: args.allListsForView,
    logout: args.logout,
  };
}

function buildSearchSidebarContext(args) {
  return {
    handleSubmit: args.handleSubmit,
    searchType: args.searchType,
    setSearchType: args.setSearchType,
    query: args.query,
    setQuery: args.setQuery,
    loading: args.loading,
    viewListId: args.viewListId,
    filterArtist: args.filterArtist,
    setFilterArtist: args.setFilterArtist,
    filterYear: args.filterYear,
    setFilterYear: args.setFilterYear,
    filterYearFrom: args.filterYearFrom,
    setFilterYearFrom: args.setFilterYearFrom,
    filterYearTo: args.filterYearTo,
    setFilterYearTo: args.setFilterYearTo,
    allowDigitsOnly: args.allowDigitsOnly,
    error: args.error,
    spotifyPlaylistsLoading: args.spotifyPlaylistsLoading,
    spotifyToken: args.spotifyToken,
    spotifyPlaylists: args.spotifyPlaylists,
    selectedPlaylistId: args.selectedPlaylistId,
    setSelectedPlaylistId: args.setSelectedPlaylistId,
    setSelectedItem: args.setSelectedItem,
    setDetailData: args.setDetailData,
    listViewData: args.listViewData,
    listViewLoading: args.listViewLoading,
    handleItemClick: args.handleItemClick,
    results: args.results,
    selectedItem: args.selectedItem,
  };
}

function buildPlaylistDetailContext(args) {
  return {
    playlistTracksLoading: args.playlistTracksLoading,
    playlistTracksData: args.playlistTracksData,
    deviceId: args.deviceId,
    spotifyToken: args.spotifyToken,
    playTrack: args.playTrack,
  };
}

function buildListModalContext(args) {
  return {
    listLoading: args.listLoading,
    lists: args.lists,
    selectedListIds: args.selectedListIds,
    toggleListSelection: args.toggleListSelection,
    handleCreateList: args.handleCreateList,
    newListName: args.newListName,
    setNewListName: args.setNewListName,
    listError: args.listError,
    handleAddToLists: args.handleAddToLists,
    handleCloseListModal: args.handleCloseListModal,
  };
}

function buildSpotifySearchModalContext(args) {
  return {
    closeSpotifySearchModal: args.closeSpotifySearchModal,
    handleSpotifySearch: args.handleSpotifySearch,
    manualMatchTrackTitle: args.manualMatchTrackTitle,
    spotifySearchQuery: args.spotifySearchQuery,
    setSpotifySearchQuery: args.setSpotifySearchQuery,
    spotifySearchArtist: args.spotifySearchArtist,
    setSpotifySearchArtist: args.setSpotifySearchArtist,
    spotifySearchAlbum: args.spotifySearchAlbum,
    setSpotifySearchAlbum: args.setSpotifySearchAlbum,
    spotifySearchLoading: args.spotifySearchLoading,
    spotifySearchResults: args.spotifySearchResults,
    handleSelectSpotifyTrack: args.handleSelectSpotifyTrack,
    spotifySearchFetched: args.spotifySearchFetched,
  };
}

function buildDetailShellContext(fields) {
  return {
    detailLoading: fields.detailLoading,
    detailData: fields.detailData,
    selectedItem: fields.selectedItem,
    albumArtReady: fields.albumArtReady,
    albumArtRetryKey: fields.albumArtRetryKey,
    setAlbumArtRetryKey: fields.setAlbumArtRetryKey,
    handleAddToList: fields.handleAddToList,
  };
}

function buildDetailTracklistContext(fields) {
  return {
    spotifyMatching: fields.spotifyMatching,
    autoplay: fields.autoplay,
    setAutoplay: fields.setAutoplay,
    tracklistFilter: fields.tracklistFilter,
    setTracklistFilter: fields.setTracklistFilter,
    getDisplayLikeState: fields.getDisplayLikeState,
    spotifyMatches: fields.spotifyMatches,
    currentTrack: fields.currentTrack,
    playbackDuration: fields.playbackDuration,
    playbackPosition: fields.playbackPosition,
    getTrackKey: fields.getTrackKey,
    handleTrackRowClick: fields.handleTrackRowClick,
    playTrack: fields.playTrack,
    openSpotifySearchModal: fields.openSpotifySearchModal,
    toggleLikeTrack: fields.toggleLikeTrack,
    spotifyToken: fields.spotifyToken,
  };
}

function buildDetailOverviewContext(fields) {
  return {
    detailData: fields.detailData,
    selectedItem: fields.selectedItem,
    overviewLoading: fields.overviewLoading,
    overview: fields.overview,
    overviewError: fields.overviewError,
  };
}

/** @param {Record<string, unknown>} args Full app state + handlers passed from useMusicDbAppState */
export function useHeaderContextValue(args) {
  return useMemo(
    () =>
      buildHeaderContext({
        spotifyToken: args.spotifyToken,
        spotifyConnectionStatus: args.spotifyConnectionStatus,
        deviceId: args.deviceId,
        isPlaying: args.isPlaying,
        currentTrack: args.currentTrack,
        togglePlayback: args.togglePlayback,
        handleSpotifyLogin: args.handleSpotifyLogin,
        viewListId: args.viewListId,
        resetOnViewSwitch: args.resetOnViewSwitch,
        allListsForView: args.allListsForView,
        logout: args.logout,
      }),
    [
      args.spotifyToken,
      args.spotifyConnectionStatus,
      args.deviceId,
      args.isPlaying,
      args.currentTrack,
      args.togglePlayback,
      args.handleSpotifyLogin,
      args.viewListId,
      args.resetOnViewSwitch,
      args.allListsForView,
      args.logout,
    ],
  );
}

/** @param {Record<string, unknown>} args */
export function useSearchSidebarContextValue(args) {
  const {
    handleSubmit,
    searchType,
    setSearchType,
    query,
    setQuery,
    loading,
    viewListId,
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
    spotifyToken,
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
  } = args;
  return useMemo(
    () =>
      buildSearchSidebarContext({
        handleSubmit,
        searchType,
        setSearchType,
        query,
        setQuery,
        loading,
        viewListId,
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
        spotifyToken,
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
      }),
    [
      handleSubmit,
      searchType,
      setSearchType,
      query,
      setQuery,
      loading,
      viewListId,
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
      spotifyToken,
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
    ],
  );
}

/** @param {Record<string, unknown>} args */
export function usePlaylistDetailContextValue(args) {
  const { playlistTracksLoading, playlistTracksData, deviceId, spotifyToken, playTrack } = args;
  return useMemo(
    () =>
      buildPlaylistDetailContext({
        playlistTracksLoading,
        playlistTracksData,
        deviceId,
        spotifyToken,
        playTrack,
      }),
    [playlistTracksLoading, playlistTracksData, deviceId, spotifyToken, playTrack],
  );
}

/** @param {Record<string, unknown>} args */
export function useListModalContextValue(args) {
  const {
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
  } = args;
  return useMemo(
    () =>
      buildListModalContext({
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
      }),
    [
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
    ],
  );
}

/** @param {Record<string, unknown>} args */
export function useSpotifySearchModalContextValue(args) {
  const {
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
  } = args;
  return useMemo(
    () =>
      buildSpotifySearchModalContext({
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
      }),
    [
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
    ],
  );
}

/** @param {Record<string, unknown>} args */
export function useDetailShellContextValue(args) {
  const {
    detailLoading,
    detailData,
    selectedItem,
    albumArtReady,
    albumArtRetryKey,
    setAlbumArtRetryKey,
    handleAddToList,
  } = args;
  return useMemo(
    () =>
      buildDetailShellContext({
        detailLoading,
        detailData,
        selectedItem,
        albumArtReady,
        albumArtRetryKey,
        setAlbumArtRetryKey,
        handleAddToList,
      }),
    [
      detailLoading,
      detailData,
      selectedItem,
      albumArtReady,
      albumArtRetryKey,
      setAlbumArtRetryKey,
      handleAddToList,
    ],
  );
}

/** @param {Record<string, unknown>} args */
export function useDetailTracklistContextValue(args) {
  const {
    spotifyMatching,
    autoplay,
    setAutoplay,
    tracklistFilter,
    setTracklistFilter,
    getDisplayLikeState,
    spotifyMatches,
    currentTrack,
    playbackDuration,
    playbackPosition,
    getTrackKey,
    handleTrackRowClick,
    playTrack,
    openSpotifySearchModal,
    toggleLikeTrack,
    spotifyToken,
  } = args;
  return useMemo(
    () =>
      buildDetailTracklistContext({
        spotifyMatching,
        autoplay,
        setAutoplay,
        tracklistFilter,
        setTracklistFilter,
        getDisplayLikeState,
        spotifyMatches,
        currentTrack,
        playbackDuration,
        playbackPosition,
        getTrackKey,
        handleTrackRowClick,
        playTrack,
        openSpotifySearchModal,
        toggleLikeTrack,
        spotifyToken,
      }),
    [
      spotifyMatching,
      autoplay,
      setAutoplay,
      tracklistFilter,
      setTracklistFilter,
      getDisplayLikeState,
      spotifyMatches,
      currentTrack,
      playbackDuration,
      playbackPosition,
      getTrackKey,
      handleTrackRowClick,
      playTrack,
      openSpotifySearchModal,
      toggleLikeTrack,
      spotifyToken,
    ],
  );
}

/** @param {Record<string, unknown>} args */
export function useDetailOverviewContextValue(args) {
  const { detailData, selectedItem, overviewLoading, overview, overviewError } = args;
  return useMemo(
    () =>
      buildDetailOverviewContext({
        detailData,
        selectedItem,
        overviewLoading,
        overview,
        overviewError,
      }),
    [detailData, selectedItem, overviewLoading, overview, overviewError],
  );
}

/**
 * Builds all slice values (each memoized independently).
 */
export function useAppContextSlices(args) {
  return {
    header: useHeaderContextValue(args),
    searchSidebar: useSearchSidebarContextValue(args),
    playlistDetail: usePlaylistDetailContextValue(args),
    listModal: useListModalContextValue(args),
    spotifySearchModal: useSpotifySearchModalContextValue(args),
    detailShell: useDetailShellContextValue(args),
    detailTracklist: useDetailTracklistContextValue(args),
    detailOverview: useDetailOverviewContextValue(args),
  };
}
