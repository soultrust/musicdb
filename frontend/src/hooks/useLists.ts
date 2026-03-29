import type { AuthFetchFn } from "../services/especiallyLikedApi";
import type { DetailData, DetailItem, SearchResultItem } from "../types/musicDbSlices";
import { useLibraryListsView } from "./lists/useLibraryListsView";
import { useSpotifyPlaylistsView } from "./lists/useSpotifyPlaylistsView";
import { useListModalActions } from "./lists/useListModalActions";

/**
 * Composes list-related UI state: MusicDB library lists, Spotify playlists pseudo-view,
 * and the add-to-list modal (create list, membership, batch add).
 */
export function useLists({
  API_BASE,
  authFetch,
  accessToken,
  spotifyToken,
  selectedItem,
  detailData,
  handleItemClick,
}: {
  API_BASE: string;
  authFetch: AuthFetchFn;
  accessToken: string | null;
  spotifyToken: string | null;
  selectedItem: DetailItem | null;
  detailData: DetailData | null;
  handleItemClick: (item: SearchResultItem) => void | Promise<void>;
}) {
  const {
    allListsForView,
    setAllListsForView,
    viewListId,
    setViewListId,
    listViewData,
    setListViewData,
    listViewLoading,
  } = useLibraryListsView({
    API_BASE,
    accessToken,
    authFetch,
    handleItemClick,
  });

  const {
    spotifyPlaylists,
    spotifyPlaylistsLoading,
    selectedPlaylistId,
    setSelectedPlaylistId,
    playlistTracksData,
    setPlaylistTracksData,
    playlistTracksLoading,
  } = useSpotifyPlaylistsView({
    API_BASE,
    accessToken,
    spotifyToken,
    viewListId,
    authFetch,
  });

  const {
    showListModal,
    setShowListModal,
    lists,
    selectedListIds,
    newListName,
    setNewListName,
    listLoading,
    listError,
    handleAddToList,
    handleCloseListModal,
    toggleListSelection,
    handleCreateList,
    handleAddToLists,
  } = useListModalActions({
    API_BASE,
    authFetch,
    accessToken,
    selectedItem,
    detailData,
    setAllListsForView,
  });

  return {
    showListModal,
    setShowListModal,
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
  };
}
