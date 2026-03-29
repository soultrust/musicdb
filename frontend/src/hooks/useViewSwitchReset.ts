import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import { useCallback } from "react";
import type {
  DetailData,
  DetailItem,
  ListViewData,
  PlaylistTracksData,
} from "../types/musicDbSlices";

export function useViewSwitchReset({
  setViewListId,
  setListViewData,
  setSelectedItem,
  setDetailData,
  setSelectedPlaylistId,
  setPlaylistTracksData,
}: {
  setViewListId: Dispatch<SetStateAction<string | number | null>>;
  setListViewData: Dispatch<SetStateAction<ListViewData | null>>;
  setSelectedItem: Dispatch<SetStateAction<DetailItem | null>>;
  setDetailData: Dispatch<SetStateAction<DetailData | null>>;
  setSelectedPlaylistId: Dispatch<SetStateAction<string | null>>;
  setPlaylistTracksData: Dispatch<SetStateAction<PlaylistTracksData | null>>;
}) {
  return useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
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
