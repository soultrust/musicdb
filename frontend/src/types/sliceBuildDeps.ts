import type { AppContextSliceArgs } from "./appContextSliceArgs";

/** Subset of `AppContextSliceArgs` passed into each `build*Context` helper */
export type HeaderSliceDeps = Pick<
  AppContextSliceArgs,
  | "spotifyToken"
  | "spotifyConnectionStatus"
  | "deviceId"
  | "isPlaying"
  | "currentTrack"
  | "togglePlayback"
  | "handleSpotifyLogin"
  | "viewListId"
  | "resetOnViewSwitch"
  | "allListsForView"
  | "logout"
>;

export type SearchSidebarSliceDeps = Pick<
  AppContextSliceArgs,
  | "handleSubmit"
  | "searchType"
  | "setSearchType"
  | "query"
  | "setQuery"
  | "loading"
  | "viewListId"
  | "filterArtist"
  | "setFilterArtist"
  | "filterYear"
  | "setFilterYear"
  | "filterYearFrom"
  | "setFilterYearFrom"
  | "filterYearTo"
  | "setFilterYearTo"
  | "allowDigitsOnly"
  | "error"
  | "spotifyPlaylistsLoading"
  | "spotifyToken"
  | "spotifyPlaylists"
  | "selectedPlaylistId"
  | "setSelectedPlaylistId"
  | "setSelectedItem"
  | "setDetailData"
  | "listViewData"
  | "listViewLoading"
  | "handleItemClick"
  | "results"
  | "selectedItem"
  | "detailLoading"
  | "detailData"
>;

export type PlaylistDetailSliceDeps = Pick<
  AppContextSliceArgs,
  "playlistTracksLoading" | "playlistTracksData" | "deviceId" | "spotifyToken" | "playTrack"
>;

export type ListModalSliceDeps = Pick<
  AppContextSliceArgs,
  | "listLoading"
  | "lists"
  | "selectedListIds"
  | "toggleListSelection"
  | "handleCreateList"
  | "newListName"
  | "setNewListName"
  | "listError"
  | "handleAddToLists"
  | "handleCloseListModal"
>;

export type SpotifySearchModalSliceDeps = Pick<
  AppContextSliceArgs,
  | "closeSpotifySearchModal"
  | "handleSpotifySearch"
  | "manualMatchTrackTitle"
  | "spotifySearchQuery"
  | "setSpotifySearchQuery"
  | "spotifySearchArtist"
  | "setSpotifySearchArtist"
  | "spotifySearchAlbum"
  | "setSpotifySearchAlbum"
  | "spotifySearchLoading"
  | "spotifySearchResults"
  | "handleSelectSpotifyTrack"
  | "spotifySearchFetched"
>;

export type DetailShellSliceDeps = Pick<
  AppContextSliceArgs,
  | "detailLoading"
  | "detailData"
  | "selectedItem"
  | "albumArtReady"
  | "albumArtRetryKey"
  | "setAlbumArtRetryKey"
  | "handleAddToList"
>;

export type DetailTracklistSliceDeps = Pick<
  AppContextSliceArgs,
  | "spotifyMatching"
  | "autoplay"
  | "setAutoplay"
  | "tracklistFilter"
  | "setTracklistFilter"
  | "getDisplayLikeState"
  | "spotifyMatches"
  | "currentTrack"
  | "playbackDuration"
  | "playbackPosition"
  | "getTrackKey"
  | "handleTrackRowClick"
  | "playTrack"
  | "handleSpotifySearchButtonClick"
  | "toggleLikeTrack"
  | "spotifyToken"
>;

export type DetailOverviewSliceDeps = Pick<
  AppContextSliceArgs,
  "detailData" | "selectedItem" | "overviewLoading" | "overview" | "overviewError"
>;
