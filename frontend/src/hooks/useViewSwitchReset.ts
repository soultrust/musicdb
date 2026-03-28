import { useCallback } from "react";

export function useViewSwitchReset({
  setViewListId,
  setListViewData,
  setSelectedItem,
  setDetailData,
  setSelectedPlaylistId,
  setPlaylistTracksData,
}) {
  return useCallback(
    (e) => {
      const v = e.target.value;
      if (v === "") {
        setViewListId(null);
        setListViewData(null);
        setSelectedItem(null);
        setDetailData(null);
        setSelectedPlaylistId(null);
        setPlaylistTracksData(null);
        return;
      }

      if (v === "spotify-playlists") {
        setViewListId("spotify-playlists");
        setListViewData(null);
        setSelectedItem(null);
        setDetailData(null);
        setSelectedPlaylistId(null);
        setPlaylistTracksData(null);
        return;
      }

      setViewListId(parseInt(v, 10));
      setSelectedItem(null);
      setDetailData(null);
      setSelectedPlaylistId(null);
      setPlaylistTracksData(null);
    },
    [
      setViewListId,
      setListViewData,
      setSelectedItem,
      setDetailData,
      setSelectedPlaylistId,
      setPlaylistTracksData,
    ],
  );
}

