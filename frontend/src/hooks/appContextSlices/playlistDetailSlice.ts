import { useMemo } from "react";
import type { AppContextSliceArgs } from "../../types/appContextSliceArgs";
import type { PlaylistDetailSliceDeps } from "../../types/sliceBuildDeps";

function buildPlaylistDetailContext(args: PlaylistDetailSliceDeps) {
  return {
    playlistTracksLoading: args.playlistTracksLoading,
    playlistTracksData: args.playlistTracksData,
    deviceId: args.deviceId,
    spotifyToken: args.spotifyToken,
    playTrack: args.playTrack,
  };
}

export function usePlaylistDetailContextValue(args: AppContextSliceArgs) {
  const { playlistTracksLoading, playlistTracksData, deviceId, spotifyToken, playTrack } = args;
  return useMemo(
    () =>
      buildPlaylistDetailContext({
        playlistTracksLoading,
        playlistTracksData,
        deviceId,
        spotifyToken,
        playTrack,
      }),
    [playlistTracksLoading, playlistTracksData, deviceId, spotifyToken, playTrack],
  );
}
