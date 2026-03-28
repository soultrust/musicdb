import type { ReactNode } from "react";
import {
  DetailOverviewSliceContext,
  DetailShellSliceContext,
  DetailTracklistSliceContext,
  HeaderSliceContext,
  ListModalSliceContext,
  PlaylistDetailSliceContext,
  SearchSidebarSliceContext,
  SpotifySearchModalSliceContext,
} from "./musicDbSliceContexts";
import type { MusicDbAppSlices } from "./musicDbSliceContexts";

export function MusicDbAppProvider({
  slices,
  children,
}: {
  slices: MusicDbAppSlices;
  children: ReactNode;
}) {
  const {
    header,
    searchSidebar,
    playlistDetail,
    listModal,
    spotifySearchModal,
    detailShell,
    detailTracklist,
    detailOverview,
  } = slices;

  return (
    <HeaderSliceContext.Provider value={header}>
      <SearchSidebarSliceContext.Provider value={searchSidebar}>
        <PlaylistDetailSliceContext.Provider value={playlistDetail}>
          <ListModalSliceContext.Provider value={listModal}>
            <SpotifySearchModalSliceContext.Provider value={spotifySearchModal}>
              <DetailShellSliceContext.Provider value={detailShell}>
                <DetailTracklistSliceContext.Provider value={detailTracklist}>
                  <DetailOverviewSliceContext.Provider value={detailOverview}>
                    {children}
                  </DetailOverviewSliceContext.Provider>
                </DetailTracklistSliceContext.Provider>
              </DetailShellSliceContext.Provider>
            </SpotifySearchModalSliceContext.Provider>
          </ListModalSliceContext.Provider>
        </PlaylistDetailSliceContext.Provider>
      </SearchSidebarSliceContext.Provider>
    </HeaderSliceContext.Provider>
  );
}
