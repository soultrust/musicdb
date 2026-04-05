import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  useAppContextSlices as useAppContextSlicesFromBarrel,
  useHeaderContextValue,
} from "./appContextSlices";
import { useAppContextSlices } from "./useAppContextSlices";

const fn = () => {};
const stableFns = {
  togglePlayback: fn,
  handleSpotifyLogin: fn,
  resetOnViewSwitch: fn,
  logout: fn,
  handleSubmit: fn,
  setSearchType: fn,
  setQuery: fn,
  setFilterArtist: fn,
  setFilterYear: fn,
  setFilterYearFrom: fn,
  setFilterYearTo: fn,
  setSelectedPlaylistId: fn,
  setSelectedItem: fn,
  setDetailData: fn,
  handleItemClick: fn,
  playTrack: fn,
  toggleListSelection: fn,
  handleCreateList: fn,
  setNewListName: fn,
  handleAddToLists: fn,
  handleCloseListModal: fn,
  closeSpotifySearchModal: fn,
  handleSpotifySearch: fn,
  setSpotifySearchQuery: fn,
  setSpotifySearchArtist: fn,
  setSpotifySearchAlbum: fn,
  handleSelectSpotifyTrack: fn,
  setAlbumArtRetryKey: fn,
  handleAddToList: fn,
  setAutoplay: fn,
  setTracklistFilter: fn,
  getDisplayLikeState: () => 0,
  getTrackKey: () => "track-key",
  handleTrackRowClick: fn,
  handleSpotifySearchButtonClick: fn,
  toggleLikeTrack: fn,
};

const BASE_ARGS = {
  spotifyToken: "sp-token",
  spotifyConnectionStatus: "connected",
  deviceId: "device-1",
  isPlaying: false,
  currentTrack: { uri: "spotify:track:1" },
  viewListId: "spotify-playlists",
  allListsForView: [{ id: 1, name: "List A", list_type: "release" }],
  searchType: "album",
  query: "Miles",
  loading: false,
  filterArtist: "",
  filterYear: "",
  filterYearFrom: "",
  filterYearTo: "",
  allowDigitsOnly: vi.fn(),
  error: null,
  spotifyPlaylistsLoading: false,
  spotifyPlaylists: [{ id: "p1", name: "Playlist" }],
  selectedPlaylistId: "p1",
  listViewData: { items: [] },
  listViewLoading: false,
  results: [{ id: "r1", title: "Result" }],
  selectedItem: { id: "a1", type: "album", title: "Album" },
  playlistTracksLoading: false,
  playlistTracksData: { tracks: [] },
  listLoading: false,
  lists: [{ id: 1, name: "List" }],
  selectedListIds: [1],
  newListName: "",
  listError: null,
  manualMatchTrackTitle: null,
  spotifySearchQuery: "",
  spotifySearchArtist: "",
  spotifySearchAlbum: "",
  spotifySearchLoading: false,
  spotifySearchResults: [],
  spotifySearchFetched: false,
  detailLoading: false,
  detailData: { title: "Album", tracklist: [] },
  albumArtReady: true,
  albumArtRetryKey: 0,
  spotifyMatching: false,
  autoplay: true,
  tracklistFilter: null,
  spotifyMatches: [],
  playbackDuration: 120000,
  playbackPosition: 3000,
  overviewLoading: false,
  overview: "Overview text",
  overviewError: null,
  API_BASE: "http://localhost",
  authFetch: vi.fn(() => Promise.resolve(new Response("{}", { status: 200 }))),
  refreshDetail: vi.fn(() => Promise.resolve()),
  ...stableFns,
};

function makeArgs(overrides = {}) {
  return { ...BASE_ARGS, ...overrides };
}

describe("useAppContextSlices", () => {
  it("re-exports the same hook from appContextSlices barrel as useAppContextSlices.js", () => {
    expect(useAppContextSlicesFromBarrel).toBe(useAppContextSlices);
  });

  it("barrel useHeaderContextValue matches header slice from useAppContextSlices", () => {
    const fromBarrel = renderHook(() => useHeaderContextValue(makeArgs()));
    const fromComposer = renderHook(() => useAppContextSlices(makeArgs()));
    expect(fromBarrel.result.current).toEqual(fromComposer.result.current.header);
  });

  it("returns all expected slice objects", () => {
    const { result } = renderHook(() => useAppContextSlices(makeArgs()));
    expect(Object.keys(result.current)).toEqual([
      "header",
      "searchSidebar",
      "playlistDetail",
      "listModal",
      "spotifySearchModal",
      "detailShell",
      "detailTracklist",
      "detailOverview",
    ]);
    expect(result.current.header.spotifyToken).toBe("sp-token");
    expect(result.current.detailOverview.overview).toBe("Overview text");
  });

  it("only changes the overview slice when overview fields change", () => {
    const { result, rerender } = renderHook((props) => useAppContextSlices(props.args), {
      initialProps: { args: makeArgs() },
    });

    const first = result.current;
    rerender({
      args: makeArgs({ overview: "Updated overview text" }),
    });

    expect(result.current.detailOverview).not.toBe(first.detailOverview);
    expect(result.current.detailShell).toBe(first.detailShell);
    expect(result.current.detailTracklist).toBe(first.detailTracklist);
    expect(result.current.header).toBe(first.header);
  });
});

