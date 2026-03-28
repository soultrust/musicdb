import { useMemo } from "react";

function buildDetailShellContext(fields) {
  return {
    detailLoading: fields.detailLoading,
    detailData: fields.detailData,
    selectedItem: fields.selectedItem,
    albumArtReady: fields.albumArtReady,
    albumArtRetryKey: fields.albumArtRetryKey,
    setAlbumArtRetryKey: fields.setAlbumArtRetryKey,
    handleAddToList: fields.handleAddToList,
  };
}

function buildDetailTracklistContext(fields) {
  return {
    spotifyMatching: fields.spotifyMatching,
    autoplay: fields.autoplay,
    setAutoplay: fields.setAutoplay,
    tracklistFilter: fields.tracklistFilter,
    setTracklistFilter: fields.setTracklistFilter,
    getDisplayLikeState: fields.getDisplayLikeState,
    spotifyMatches: fields.spotifyMatches,
    currentTrack: fields.currentTrack,
    playbackDuration: fields.playbackDuration,
    playbackPosition: fields.playbackPosition,
    getTrackKey: fields.getTrackKey,
    handleTrackRowClick: fields.handleTrackRowClick,
    playTrack: fields.playTrack,
    handleSpotifySearchButtonClick: fields.handleSpotifySearchButtonClick,
    toggleLikeTrack: fields.toggleLikeTrack,
    spotifyToken: fields.spotifyToken,
  };
}

function buildDetailOverviewContext(fields) {
  return {
    detailData: fields.detailData,
    selectedItem: fields.selectedItem,
    overviewLoading: fields.overviewLoading,
    overview: fields.overview,
    overviewError: fields.overviewError,
  };
}

/** @param {Record<string, unknown>} args */
export function useDetailShellContextValue(args) {
  const {
    detailLoading,
    detailData,
    selectedItem,
    albumArtReady,
    albumArtRetryKey,
    setAlbumArtRetryKey,
    handleAddToList,
  } = args;
  return useMemo(
    () =>
      buildDetailShellContext({
        detailLoading,
        detailData,
        selectedItem,
        albumArtReady,
        albumArtRetryKey,
        setAlbumArtRetryKey,
        handleAddToList,
      }),
    [
      detailLoading,
      detailData,
      selectedItem,
      albumArtReady,
      albumArtRetryKey,
      setAlbumArtRetryKey,
      handleAddToList,
    ],
  );
}

/** @param {Record<string, unknown>} args */
export function useDetailTracklistContextValue(args) {
  const {
    spotifyMatching,
    autoplay,
    setAutoplay,
    tracklistFilter,
    setTracklistFilter,
    getDisplayLikeState,
    spotifyMatches,
    currentTrack,
    playbackDuration,
    playbackPosition,
    getTrackKey,
    handleTrackRowClick,
    playTrack,
    handleSpotifySearchButtonClick,
    toggleLikeTrack,
    spotifyToken,
  } = args;
  return useMemo(
    () =>
      buildDetailTracklistContext({
        spotifyMatching,
        autoplay,
        setAutoplay,
        tracklistFilter,
        setTracklistFilter,
        getDisplayLikeState,
        spotifyMatches,
        currentTrack,
        playbackDuration,
        playbackPosition,
        getTrackKey,
        handleTrackRowClick,
        playTrack,
        handleSpotifySearchButtonClick,
        toggleLikeTrack,
        spotifyToken,
      }),
    [
      spotifyMatching,
      autoplay,
      setAutoplay,
      tracklistFilter,
      setTracklistFilter,
      getDisplayLikeState,
      spotifyMatches,
      currentTrack,
      playbackDuration,
      playbackPosition,
      getTrackKey,
      handleTrackRowClick,
      playTrack,
      handleSpotifySearchButtonClick,
      toggleLikeTrack,
      spotifyToken,
    ],
  );
}

/** @param {Record<string, unknown>} args */
export function useDetailOverviewContextValue(args) {
  const { detailData, selectedItem, overviewLoading, overview, overviewError } = args;
  return useMemo(
    () =>
      buildDetailOverviewContext({
        detailData,
        selectedItem,
        overviewLoading,
        overview,
        overviewError,
      }),
    [detailData, selectedItem, overviewLoading, overview, overviewError],
  );
}
