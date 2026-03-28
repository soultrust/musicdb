import { useMemo } from "react";

function buildPlaylistDetailContext(args) {
  return {
    playlistTracksLoading: args.playlistTracksLoading,
    playlistTracksData: args.playlistTracksData,
    deviceId: args.deviceId,
    spotifyToken: args.spotifyToken,
    playTrack: args.playTrack,
  };
}

/** @param {Record<string, unknown>} args */
export function usePlaylistDetailContextValue(args) {
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
