import { useMemo } from "react";
import type { AppContextSliceArgs } from "../../types/appContextSliceArgs";
import type {
  DetailOverviewSliceDeps,
  DetailShellSliceDeps,
  DetailTracklistSliceDeps,
} from "../../types/sliceBuildDeps";

function buildDetailShellContext(fields: DetailShellSliceDeps) {
  return {
    detailLoading: fields.detailLoading,
    detailData: fields.detailData,
    selectedItem: fields.selectedItem,
    albumArtReady: fields.albumArtReady,
    albumArtRetryKey: fields.albumArtRetryKey,
    setAlbumArtRetryKey: fields.setAlbumArtRetryKey,
    handleAddToList: fields.handleAddToList,
    handleItemClick: fields.handleItemClick,
  };
}

function buildDetailTracklistContext(fields: DetailTracklistSliceDeps) {
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

function buildDetailOverviewContext(fields: DetailOverviewSliceDeps) {
  return {
    detailData: fields.detailData,
    selectedItem: fields.selectedItem,
    overviewLoading: fields.overviewLoading,
    overview: fields.overview,
    overviewError: fields.overviewError,
  };
}

export function useDetailShellContextValue(args: AppContextSliceArgs) {
  const {
    detailLoading,
    detailData,
    selectedItem,
    albumArtReady,
    albumArtRetryKey,
    setAlbumArtRetryKey,
    handleAddToList,
    handleItemClick,
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
        handleItemClick,
      }),
    [
      detailLoading,
      detailData,
      selectedItem,
      albumArtReady,
      albumArtRetryKey,
      setAlbumArtRetryKey,
      handleAddToList,
      handleItemClick,
    ],
  );
}

export function useDetailTracklistContextValue(args: AppContextSliceArgs) {
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

export function useDetailOverviewContextValue(args: AppContextSliceArgs) {
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
