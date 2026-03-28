import { createContext, useContext, type Context } from "react";
import type {
  DetailOverviewSliceValue,
  DetailShellSliceValue,
  DetailTracklistSliceValue,
  HeaderSliceValue,
  ListModalSliceValue,
  MusicDbAppSlices,
  PlaylistDetailSliceValue,
  SearchSidebarSliceValue,
  SpotifySearchModalSliceValue,
} from "../types/musicDbSlices";

export const HeaderSliceContext = createContext<HeaderSliceValue | null>(null);
export const SearchSidebarSliceContext = createContext<SearchSidebarSliceValue | null>(null);
export const PlaylistDetailSliceContext = createContext<PlaylistDetailSliceValue | null>(null);
export const ListModalSliceContext = createContext<ListModalSliceValue | null>(null);
export const SpotifySearchModalSliceContext = createContext<SpotifySearchModalSliceValue | null>(null);
export const DetailShellSliceContext = createContext<DetailShellSliceValue | null>(null);
export const DetailTracklistSliceContext = createContext<DetailTracklistSliceValue | null>(null);
export const DetailOverviewSliceContext = createContext<DetailOverviewSliceValue | null>(null);

function createSliceHook<T>(Context: Context<T | null>, name: string): () => T {
  return function useSlice(): T {
    const value = useContext(Context);
    if (value == null) {
      throw new Error(`${name} must be used within MusicDbAppProvider`);
    }
    return value;
  };
}

export const useHeaderContext = createSliceHook(HeaderSliceContext, "useHeaderContext");
export const useSearchSidebarContext = createSliceHook(
  SearchSidebarSliceContext,
  "useSearchSidebarContext",
);
export const usePlaylistDetailContext = createSliceHook(
  PlaylistDetailSliceContext,
  "usePlaylistDetailContext",
);
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

export type { MusicDbAppSlices };
