import { useDetailOverviewContextValue, useDetailShellContextValue, useDetailTracklistContextValue } from "./detailSlices";
import { useHeaderContextValue } from "./headerSlice";
import { useListModalContextValue } from "./listModalSlice";
import { usePlaylistDetailContextValue } from "./playlistDetailSlice";
import { useSearchSidebarContextValue } from "./searchSidebarSlice";
import { useSpotifySearchModalContextValue } from "./spotifySearchModalSlice";

export {
  useDetailOverviewContextValue,
  useDetailShellContextValue,
  useDetailTracklistContextValue,
  useHeaderContextValue,
  useListModalContextValue,
  usePlaylistDetailContextValue,
  useSearchSidebarContextValue,
  useSpotifySearchModalContextValue,
};

/**
 * Builds all slice values (each memoized independently).
 * @param {Record<string, unknown>} args Full app state + handlers from useMusicDbAppState
 */
export function useAppContextSlices(args) {
  return {
    header: useHeaderContextValue(args),
    searchSidebar: useSearchSidebarContextValue(args),
    playlistDetail: usePlaylistDetailContextValue(args),
    listModal: useListModalContextValue(args),
    spotifySearchModal: useSpotifySearchModalContextValue(args),
    detailShell: useDetailShellContextValue(args),
    detailTracklist: useDetailTracklistContextValue(args),
    detailOverview: useDetailOverviewContextValue(args),
  };
}
