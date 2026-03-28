import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./lists/useLibraryListsView", () => ({
  useLibraryListsView: vi.fn(() => ({
    allListsForView: [{ id: 1, name: "L1", list_type: "release" }],
    setAllListsForView: vi.fn(),
    viewListId: 1,
    setViewListId: vi.fn(),
    listViewData: { id: 1, items: [] },
    setListViewData: vi.fn(),
    listViewLoading: false,
  })),
}));

vi.mock("./lists/useSpotifyPlaylistsView", () => ({
  useSpotifyPlaylistsView: vi.fn(() => ({
    spotifyPlaylists: [{ id: "p1", name: "Playlist" }],
    spotifyPlaylistsLoading: false,
    selectedPlaylistId: "p1",
    setSelectedPlaylistId: vi.fn(),
    playlistTracksData: { id: "p1", tracks: [] },
    setPlaylistTracksData: vi.fn(),
    playlistTracksLoading: false,
  })),
}));

vi.mock("./lists/useListModalActions", () => ({
  useListModalActions: vi.fn(() => ({
    showListModal: false,
    setShowListModal: vi.fn(),
    lists: [{ id: 10, name: "Favs", list_type: "release" }],
    selectedListIds: [10],
    newListName: "",
    setNewListName: vi.fn(),
    listLoading: false,
    listError: null,
    handleAddToList: vi.fn(),
    handleCloseListModal: vi.fn(),
    toggleListSelection: vi.fn(),
    handleCreateList: vi.fn(),
    handleAddToLists: vi.fn(),
  })),
}));

import { useLists } from "./useLists";

describe("useLists", () => {
  it("composes and exposes a stable public surface", () => {
    const { result } = renderHook(() =>
      useLists({
        API_BASE: "http://localhost:8000",
        authFetch: vi.fn(),
        accessToken: "jwt",
        spotifyToken: "sp",
        selectedItem: { id: "1", type: "album", title: "A" },
        detailData: null,
        handleItemClick: vi.fn(),
      }),
    );

    expect(result.current.allListsForView).toEqual([{ id: 1, name: "L1", list_type: "release" }]);
    expect(result.current.spotifyPlaylists[0].id).toBe("p1");
    expect(result.current.lists[0].id).toBe(10);
    expect(result.current.selectedListIds).toEqual([10]);
    expect(typeof result.current.handleAddToLists).toBe("function");
  });
});

