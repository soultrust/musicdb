import { createContext, useContext } from "react";

export const HeaderSliceContext = createContext(null);
export const SearchSidebarSliceContext = createContext(null);
export const PlaylistDetailSliceContext = createContext(null);
export const ListModalSliceContext = createContext(null);
export const SpotifySearchModalSliceContext = createContext(null);
export const DetailShellSliceContext = createContext(null);
export const DetailTracklistSliceContext = createContext(null);
export const DetailOverviewSliceContext = createContext(null);

function createSliceHook(Context, name) {
  return function useSlice() {
    const value = useContext(Context);
    if (value == null) {
      throw new Error(`${name} must be used within MusicDbAppProvider`);
    }
    return value;
  };
}

export const useHeaderContext = createSliceHook(HeaderSliceContext, "useHeaderContext");
export const useSearchSidebarContext = createSliceHook(SearchSidebarSliceContext, "useSearchSidebarContext");
export const usePlaylistDetailContext = createSliceHook(PlaylistDetailSliceContext, "usePlaylistDetailContext");
export const useListModalContext = createSliceHook(ListModalSliceContext, "useListModalContext");
export const useSpotifySearchModalContext = createSliceHook(
  SpotifySearchModalSliceContext,
  "useSpotifySearchModalContext",
);
export const useDetailShellContext = createSliceHook(DetailShellSliceContext, "useDetailShellContext");
export const useDetailTracklistContext = createSliceHook(
  DetailTracklistSliceContext,
  "useDetailTracklistContext",
);
export const useDetailOverviewContext = createSliceHook(
  DetailOverviewSliceContext,
  "useDetailOverviewContext",
);
