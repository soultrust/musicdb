import { useMemo } from "react";

function buildSpotifySearchModalContext(args) {
  return {
    closeSpotifySearchModal: args.closeSpotifySearchModal,
    handleSpotifySearch: args.handleSpotifySearch,
    manualMatchTrackTitle: args.manualMatchTrackTitle,
    spotifySearchQuery: args.spotifySearchQuery,
    setSpotifySearchQuery: args.setSpotifySearchQuery,
    spotifySearchArtist: args.spotifySearchArtist,
    setSpotifySearchArtist: args.setSpotifySearchArtist,
    spotifySearchAlbum: args.spotifySearchAlbum,
    setSpotifySearchAlbum: args.setSpotifySearchAlbum,
    spotifySearchLoading: args.spotifySearchLoading,
    spotifySearchResults: args.spotifySearchResults,
    handleSelectSpotifyTrack: args.handleSelectSpotifyTrack,
    spotifySearchFetched: args.spotifySearchFetched,
  };
}

/** @param {Record<string, unknown>} args */
export function useSpotifySearchModalContextValue(args) {
  const {
    closeSpotifySearchModal,
    handleSpotifySearch,
    manualMatchTrackTitle,
    spotifySearchQuery,
    setSpotifySearchQuery,
    spotifySearchArtist,
    setSpotifySearchArtist,
    spotifySearchAlbum,
    setSpotifySearchAlbum,
    spotifySearchLoading,
    spotifySearchResults,
    handleSelectSpotifyTrack,
    spotifySearchFetched,
  } = args;
  return useMemo(
    () =>
      buildSpotifySearchModalContext({
        closeSpotifySearchModal,
        handleSpotifySearch,
        manualMatchTrackTitle,
        spotifySearchQuery,
        setSpotifySearchQuery,
        spotifySearchArtist,
        setSpotifySearchArtist,
        spotifySearchAlbum,
        setSpotifySearchAlbum,
        spotifySearchLoading,
        spotifySearchResults,
        handleSelectSpotifyTrack,
        spotifySearchFetched,
      }),
    [
      closeSpotifySearchModal,
      handleSpotifySearch,
      manualMatchTrackTitle,
      spotifySearchQuery,
      setSpotifySearchQuery,
      spotifySearchArtist,
      setSpotifySearchArtist,
      spotifySearchAlbum,
      setSpotifySearchAlbum,
      spotifySearchLoading,
      spotifySearchResults,
      handleSelectSpotifyTrack,
      spotifySearchFetched,
    ],
  );
}
