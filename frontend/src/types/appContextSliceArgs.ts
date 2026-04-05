import type {
  ChangeEvent,
  Dispatch,
  FormEvent,
  MouseEvent,
  SetStateAction,
  SyntheticEvent,
} from "react";
import type { AuthFetchFn } from "../services/especiallyLikedApi";
import type {
  CatalogTrack,
  DetailData,
  DetailItem,
  ListForView,
  ListViewData,
  PlaylistTracksData,
  SearchResultItem,
  SpotifyMatchRow,
  SpotifyTrackRef,
} from "./musicDbSlices";

/** Single bag of state + handlers passed from `useMusicDbAppState` into `useAppContextSlices`. */
export interface AppContextSliceArgs {
  spotifyToken: string | null;
  spotifyConnectionStatus: string;
  deviceId: string | null;
  isPlaying: boolean;
  currentTrack: SpotifyTrackRef | null;
  togglePlayback: () => void;
  handleSpotifyLogin: (e?: SyntheticEvent) => void;
  viewListId: string | number | null;
  resetOnViewSwitch: (e: ChangeEvent<HTMLSelectElement>) => void;
  allListsForView: ListForView[];
  logout: () => void;
  handleSubmit: (e?: FormEvent<Element>) => void | Promise<void>;
  searchType: string;
  setSearchType: (v: string) => void;
  query: string;
  setQuery: (v: string) => void;
  loading: boolean;
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
  spotifyPlaylists: Array<{ id: string; name: string; [key: string]: unknown }>;
  selectedPlaylistId: string | null;
  setSelectedPlaylistId: (id: string | null) => void;
  setSelectedItem: (item: DetailItem | null) => void;
  setDetailData: (data: DetailData | null) => void;
  listViewData: ListViewData | null;
  listViewLoading: boolean;
  handleItemClick: (item: SearchResultItem) => void;
  results: SearchResultItem[];
  selectedItem: DetailItem | null;
  playlistTracksLoading: boolean;
  playlistTracksData: PlaylistTracksData | null;
  playTrack: (uri: string) => void;
  listLoading: boolean;
  lists: Array<{ id: number; name: string; [key: string]: unknown }>;
  selectedListIds: number[];
  toggleListSelection: (id: number) => void;
  handleCreateList: (e?: FormEvent) => void | Promise<void>;
  newListName: string;
  setNewListName: (v: string) => void;
  listError: string | null;
  handleAddToLists: (e?: FormEvent) => void;
  handleCloseListModal: () => void;
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
  detailLoading: boolean;
  detailData: DetailData | null;
  albumArtReady: boolean;
  albumArtRetryKey: number;
  setAlbumArtRetryKey: Dispatch<SetStateAction<number>>;
  handleAddToList: () => void;
  spotifyMatching: boolean;
  autoplay: boolean;
  setAutoplay: Dispatch<SetStateAction<boolean>>;
  tracklistFilter: string | null;
  setTracklistFilter: Dispatch<SetStateAction<string | null>>;
  getDisplayLikeState: (track: CatalogTrack) => number;
  spotifyMatches: SpotifyMatchRow[];
  playbackDuration: number;
  playbackPosition: number;
  getTrackKey: (track: CatalogTrack) => string | null;
  handleTrackRowClick: (e: MouseEvent, isActive: boolean) => void;
  handleSpotifySearchButtonClick: (trackTitle: string) => void;
  toggleLikeTrack: (track: CatalogTrack) => void;
  overviewLoading: boolean;
  overview: string | null;
  overviewError: string | null;
  API_BASE: string;
  authFetch: AuthFetchFn;
  refreshDetail: () => Promise<void>;
}
