import { useMemo } from "react";
import type { AppContextSliceArgs } from "../../types/appContextSliceArgs";
import type { HeaderSliceDeps } from "../../types/sliceBuildDeps";

function buildHeaderContext(args: HeaderSliceDeps) {
  return {
    spotifyToken: args.spotifyToken,
    spotifyConnectionStatus: args.spotifyConnectionStatus,
    deviceId: args.deviceId,
    isPlaying: args.isPlaying,
    currentTrack: args.currentTrack,
    togglePlayback: args.togglePlayback,
    handleSpotifyLogin: args.handleSpotifyLogin,
    viewListId: args.viewListId,
    onViewListChange: args.resetOnViewSwitch,
    allListsForView: args.allListsForView,
    logout: args.logout,
  };
}

export function useHeaderContextValue(args: AppContextSliceArgs) {
  return useMemo(
    () =>
      buildHeaderContext({
        spotifyToken: args.spotifyToken,
        spotifyConnectionStatus: args.spotifyConnectionStatus,
        deviceId: args.deviceId,
        isPlaying: args.isPlaying,
        currentTrack: args.currentTrack,
        togglePlayback: args.togglePlayback,
        handleSpotifyLogin: args.handleSpotifyLogin,
        viewListId: args.viewListId,
        resetOnViewSwitch: args.resetOnViewSwitch,
        allListsForView: args.allListsForView,
        logout: args.logout,
      }),
    [
      args.spotifyToken,
      args.spotifyConnectionStatus,
      args.deviceId,
      args.isPlaying,
      args.currentTrack,
      args.togglePlayback,
      args.handleSpotifyLogin,
      args.viewListId,
      args.resetOnViewSwitch,
      args.allListsForView,
      args.logout,
    ],
  );
}
