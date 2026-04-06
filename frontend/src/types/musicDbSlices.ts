import type {
  ChangeEvent,
  Dispatch,
  FormEvent,
  MouseEvent,
  SetStateAction,
  SyntheticEvent,
} from "react";

import type { AuthFetchFn } from "../services/especiallyLikedApi";

/** Loose catalog / search result shapes flowing through the app */
export type DetailItem = {
  id: string;
  type: string;
  title?: string;
  uri?: string;
  [key: string]: unknown;
};

export type CatalogTrack = {
  title: string;
  position?: string;
  duration?: string;
  state?: number;
  [key: string]: unknown;
};

export type SpotifyArtist = { name: string; id?: string };

export type DetailImage = { uri?: string; [key: string]: unknown };

/** Release / master / artist detail payload from the API */
export type DetailData = {
  title?: string;
  thumb?: string;
  images?: DetailImage[];
  uri?: string;
  artists?: SpotifyArtist[];
  year?: string | number;
  formats?: Array<{ name?: string; qty?: string; [key: string]: unknown }>;
  country?: string;
  genres?: string[];
  styles?: string[];
  labels?: Array<{ name?: string; catno?: string; [key: string]: unknown }>;
  tracklist?: CatalogTrack[];
  profile?: string;
  /** MusicBrainz annotation (artist detail) */
  description?: string | null;
  disambiguation?: string | null;
  /** Artist releases (deduped), for sidebar + main panel */
  albums?: Array<{ id: string; title?: string; year?: string | null; thumb?: string | null }>;
  /** True when thumb comes from user's saved Spotify image pick */
  manual_spotify_artist_image?: boolean;
  [key: string]: unknown;
};

export type SpotifyTrackRef = {
  uri?: string;
  id?: string;
  name?: string;
  artists?: SpotifyArtist[];
  album?: { name?: string; [key: string]: unknown };
  [key: string]: unknown;
};

export type SpotifyMatchRow = {
  catalog_title?: string;
  discogs_title?: string;
  manual_match?: boolean;
  spotify_track?: SpotifyTrackRef | null;
  [key: string]: unknown;
};

export type ListForView = { id: number; name: string; list_type?: string; [key: string]: unknown };

export interface HeaderSliceValue {
  spotifyToken: string | null;
  spotifyConnectionStatus: string;
  deviceId: string | null;
  isPlaying: boolean;
  currentTrack: SpotifyTrackRef | null;
  togglePlayback: () => void;
  handleSpotifyLogin: (e?: SyntheticEvent) => void;
  /** Numeric list id, `"spotify-playlists"`, or null */
  viewListId: string | number | null;
  onViewListChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  allListsForView: ListForView[];
  logout: () => void;
}

export type SearchResultItem = { id: string; title?: string; name?: string; type?: string; [key: string]: unknown };

export type ListViewData = {
  items?: SearchResultItem[];
  name?: string;
  [key: string]: unknown;
};

export interface SearchSidebarSliceValue {
  handleSubmit: (e?: FormEvent<Element>) => void | Promise<void>;
  searchType: string;
  setSearchType: (v: string) => void;
  query: string;
  setQuery: (v: string) => void;
  loading: boolean;
  viewListId: string | number | null;
  filterArtist: string;
  setFilterArtist: (v: string) => void;
  filterYear: string;
  setFilterYear: (v: string) => void;
  filterYearFrom: string;
  setFilterYearFrom: (v: string) => void;
  filterYearTo: string;
  setFilterYearTo: (v: string) => void;
  allowDigitsOnly: (
    setter: (v: string) => void,
    maxLength?: number,
  ) => (e: ChangeEvent<HTMLInputElement>) => void;
  error: string | null;
  spotifyPlaylistsLoading: boolean;
  spotifyToken: string | null;
  spotifyPlaylists: Array<{ id: string; name: string; owner?: string; [key: string]: unknown }>;
  selectedPlaylistId: string | null;
  setSelectedPlaylistId: (id: string | null) => void;
  handlePlaylistClick: (playlistId: string) => void;
  setSelectedItem: (item: DetailItem | null) => void;
  setDetailData: (data: DetailData | null) => void;
  listViewData: ListViewData | null;
  listViewLoading: boolean;
  handleItemClick: (item: SearchResultItem) => void;
  results: SearchResultItem[];
  selectedItem: DetailItem | null;
}

export type PlaylistTrackRow = {
  id?: string;
  name?: string;
  uri?: string;
  artists?: SpotifyArtist[];
  album?: string;
  [key: string]: unknown;
};

export type PlaylistTracksData = {
  name?: string;
  images?: Array<{ url?: string; [key: string]: unknown }>;
  owner?: string;
  description?: string;
  tracks?: PlaylistTrackRow[];
  [key: string]: unknown;
};

export interface PlaylistDetailSliceValue {
  playlistTracksLoading: boolean;
  playlistTracksData: PlaylistTracksData | null;
  deviceId: string | null;
  spotifyToken: string | null;
  playTrack: (uri: string) => void;
}

export interface ListModalSliceValue {
  listLoading: boolean;
  lists: Array<{ id: number; name: string; [key: string]: unknown }>;
  selectedListIds: number[];
  toggleListSelection: (id: number) => void;
  handleCreateList: (e?: FormEvent) => void | Promise<void>;
  newListName: string;
  setNewListName: (v: string) => void;
  listError: string | null;
  handleAddToLists: (e?: FormEvent) => void | Promise<void>;
  handleCloseListModal: () => void;
}

export interface SpotifySearchModalSliceValue {
  closeSpotifySearchModal: () => void;
  handleSpotifySearch: (e?: FormEvent<Element>) => void | Promise<void>;
  manualMatchTrackTitle: string | null;
  spotifySearchQuery: string;
  setSpotifySearchQuery: (v: string) => void;
  spotifySearchArtist: string;
  setSpotifySearchArtist: (v: string) => void;
  spotifySearchAlbum: string;
  setSpotifySearchAlbum: (v: string) => void;
  spotifySearchLoading: boolean;
  spotifySearchResults: SpotifyTrackRef[];
  handleSelectSpotifyTrack: (track: SpotifyTrackRef) => void | Promise<void>;
  spotifySearchFetched: boolean;
}

export interface DetailShellSliceValue {
  detailLoading: boolean;
  detailData: DetailData | null;
  selectedItem: DetailItem | null;
  albumArtReady: boolean;
  albumArtRetryKey: number;
  setAlbumArtRetryKey: Dispatch<SetStateAction<number>>;
  handleAddToList: () => void;
  handleItemClick: (item: SearchResultItem) => void;
  API_BASE: string;
  authFetch: AuthFetchFn;
  refreshDetail: () => Promise<void>;
}

export interface DetailTracklistSliceValue {
  spotifyMatching: boolean;
  autoplay: boolean;
  setAutoplay: Dispatch<SetStateAction<boolean>>;
  /** `null` = all tracks; also "liked" | "especially"; tests may use other strings for "show all" fallthrough */
  tracklistFilter: string | null;
  setTracklistFilter: Dispatch<SetStateAction<string | null>>;
  getDisplayLikeState: (track: CatalogTrack) => number;
  spotifyMatches: SpotifyMatchRow[];
  currentTrack: SpotifyTrackRef | null;
  playbackDuration: number;
  playbackPosition: number;
  getTrackKey: (track: CatalogTrack) => string | null;
  handleTrackRowClick: (e: MouseEvent, isActive: boolean) => void;
  playTrack: (uri: string) => void;
  handleSpotifySearchButtonClick: (trackTitle: string) => void;
  toggleLikeTrack: (track: CatalogTrack) => void;
  spotifyToken: string | null;
}

export interface DetailOverviewSliceValue {
  detailData: DetailData | null;
  selectedItem: DetailItem | null;
  overviewLoading: boolean;
  overview: string | null;
  overviewError: string | null;
}

export interface MusicDbAppSlices {
  header: HeaderSliceValue;
  searchSidebar: SearchSidebarSliceValue;
  playlistDetail: PlaylistDetailSliceValue;
  listModal: ListModalSliceValue;
  spotifySearchModal: SpotifySearchModalSliceValue;
  detailShell: DetailShellSliceValue;
  detailTracklist: DetailTracklistSliceValue;
  detailOverview: DetailOverviewSliceValue;
}
