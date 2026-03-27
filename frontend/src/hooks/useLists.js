import { useLibraryListsView } from "./lists/useLibraryListsView";
import { useSpotifyPlaylistsView } from "./lists/useSpotifyPlaylistsView";
import { useListModalActions } from "./lists/useListModalActions";

/**
 * Composes list-related UI state: MusicDB library lists, Spotify playlists pseudo-view,
 * and the add-to-list modal (create list, membership, batch add).
 *
 * Returned shape is stable for `App.jsx` and other consumers.
 *
 * @param {object} args
 * @param {string} args.API_BASE
 * @param {function} args.authFetch
 * @param {string|null} args.accessToken
 * @param {string|null} args.spotifyToken
 * @param {object|null} args.selectedItem
 * @param {object|null} args.detailData
 * @param {function} args.handleItemClick
 */
export function useLists({
  API_BASE,
  authFetch,
  accessToken,
  spotifyToken,
  selectedItem,
  detailData,
  handleItemClick,
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

