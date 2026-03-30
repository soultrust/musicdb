import { vi } from "vitest";
import type { CatalogTrack } from "../types/musicDbSlices";
import type {
  DetailOverviewSliceValue,
  DetailShellSliceValue,
  DetailTracklistSliceValue,
  HeaderSliceValue,
  ListModalSliceValue,
  PlaylistDetailSliceValue,
  SpotifySearchModalSliceValue,
} from "../types/musicDbSlices";

/** Defaults for `AppHeader` / header slice tests */
export function buildHeaderSliceValue(overrides: Partial<HeaderSliceValue> = {}): HeaderSliceValue {
  return {
    spotifyToken: null,
    spotifyConnectionStatus: "disconnected",
    deviceId: null,
    isPlaying: false,
    currentTrack: null,
    togglePlayback: vi.fn(),
    handleSpotifyLogin: vi.fn(),
    viewListId: null,
    onViewListChange: vi.fn(),
    allListsForView: [],
    logout: vi.fn(),
    ...overrides,
  };
}

/** Defaults for `PlaylistDetail` / playlist detail slice tests */
export function buildPlaylistDetailSliceValue(
  overrides: Partial<PlaylistDetailSliceValue> = {},
): PlaylistDetailSliceValue {
  return {
    playlistTracksLoading: false,
    playlistTracksData: null,
    deviceId: null,
    spotifyToken: null,
    playTrack: vi.fn(),
    ...overrides,
  };
}

/** Defaults for `DetailOverview` / overview slice tests */
export function buildDetailOverviewSliceValue(
  overrides: Partial<DetailOverviewSliceValue> = {},
): DetailOverviewSliceValue {
  return {
    detailData: null,
    selectedItem: null,
    overviewLoading: false,
    overview: null,
    overviewError: null,
    ...overrides,
  };
}

/** Defaults for `SelectedItemDetail` / detail shell slice tests */
export function buildDetailShellSliceValue(
  overrides: Partial<DetailShellSliceValue> = {},
): DetailShellSliceValue {
  return {
    detailLoading: false,
    detailData: null,
    selectedItem: null,
    albumArtReady: true,
    albumArtRetryKey: 0,
    setAlbumArtRetryKey: vi.fn(),
    handleAddToList: vi.fn(),
    ...overrides,
  };
}

/** Defaults for `TrackList` / tracklist slice tests */
export function buildDetailTracklistSliceValue(
  overrides: Partial<DetailTracklistSliceValue> = {},
): DetailTracklistSliceValue {
  return {
    spotifyMatching: false,
    autoplay: false,
    setAutoplay: vi.fn(),
    tracklistFilter: null,
    setTracklistFilter: vi.fn(),
    getDisplayLikeState: vi.fn(() => 0),
    spotifyMatches: [],
    currentTrack: null,
    playbackDuration: 0,
    playbackPosition: 0,
    getTrackKey: vi.fn((t: CatalogTrack) => t.title),
    handleTrackRowClick: vi.fn(),
    playTrack: vi.fn(),
    handleSpotifySearchButtonClick: vi.fn(),
    toggleLikeTrack: vi.fn(),
    spotifyToken: "tok",
    ...overrides,
  };
}

/** Defaults for `ListModal` / list-modal hook tests */
export function buildListModalSliceValue(
  overrides: Partial<ListModalSliceValue> = {},
): ListModalSliceValue {
  return {
    listLoading: false,
    lists: [],
    selectedListIds: [],
    toggleListSelection: vi.fn(),
    handleCreateList: vi.fn(),
    newListName: "",
    setNewListName: vi.fn(),
    listError: null,
    handleAddToLists: vi.fn(),
    handleCloseListModal: vi.fn(),
    ...overrides,
  };
}

/** Defaults for `SpotifySearchModal` / Spotify search hook tests */
export function buildSpotifySearchModalSliceValue(
  overrides: Partial<SpotifySearchModalSliceValue> = {},
): SpotifySearchModalSliceValue {
  return {
    closeSpotifySearchModal: vi.fn(),
    handleSpotifySearch: vi.fn(),
    manualMatchTrackTitle: null,
    spotifySearchQuery: "",
    setSpotifySearchQuery: vi.fn(),
    spotifySearchArtist: "",
    setSpotifySearchArtist: vi.fn(),
    spotifySearchAlbum: "",
    setSpotifySearchAlbum: vi.fn(),
    spotifySearchLoading: false,
    spotifySearchResults: [],
    handleSelectSpotifyTrack: vi.fn(),
    spotifySearchFetched: false,
    ...overrides,
  };
}
