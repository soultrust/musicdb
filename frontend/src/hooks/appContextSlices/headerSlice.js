import { useMemo } from "react";

function buildHeaderContext(args) {
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

/** @param {Record<string, unknown>} args Full app state + handlers passed from useMusicDbAppState */
export function useHeaderContextValue(args) {
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
