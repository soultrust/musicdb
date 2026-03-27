import {
  HeaderSliceContext,
  SearchSidebarSliceContext,
  PlaylistDetailSliceContext,
  ListModalSliceContext,
  SpotifySearchModalSliceContext,
  DetailShellSliceContext,
  DetailTracklistSliceContext,
  DetailOverviewSliceContext,
} from "./musicDbSliceContexts";

/**
 * Nests one React context per UI slice so consumers only re-render when their slice changes.
 *
 * @param {object} props
 * @param {object} props.slices
 * @param {object} props.slices.detailShell Main column: loading, artwork, meta, list button
 * @param {object} props.slices.detailTracklist Playback, Spotify match, filters, likes
 * @param {object} props.slices.detailOverview Sidebar: fetched overview text + errors
 */
export function MusicDbAppProvider({ slices, children }) {
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
