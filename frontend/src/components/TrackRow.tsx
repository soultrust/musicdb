import type { MouseEvent } from "react";
import type { CatalogTrack, SpotifyArtist, SpotifyTrackRef } from "../types/musicDbSlices";

export interface TrackRowProps {
  track: CatalogTrack;
  index: number;
  spotifyTrack: SpotifyTrackRef | null | undefined;
  matchExists: boolean;
  /** True when this row's Spotify track matches current playback track URI */
  isCurrentTrack: boolean;
  isActive: boolean;
  progress: number;
  likeState: number;
  matchedDisconnected: boolean;
  getTrackKey: (track: CatalogTrack) => string | null;
  handleTrackRowClick: (e: MouseEvent, isActive: boolean) => void;
  playTrack: (uri: string) => void;
  /** Global Spotify playback state, from header slice */
  isPlaying: boolean;
  manualSpotifyMatch?: boolean;
  onSpotifySearchClick: (trackTitle: string) => void;
  toggleLikeTrack: (track: CatalogTrack) => void;
  togglePlayback: () => void;
}

export default function TrackRow({
  track,
  index,
  spotifyTrack,
  matchExists,
  isCurrentTrack,
  isActive,
  progress,
  likeState,
  matchedDisconnected,
  getTrackKey,
  handleTrackRowClick,
  playTrack,
  isPlaying,
  manualSpotifyMatch = false,
  onSpotifySearchClick,
  toggleLikeTrack,
  togglePlayback,
}: TrackRowProps) {
  const artists = spotifyTrack?.artists ?? [];
  const isPlayingThisTrack = Boolean(isCurrentTrack && isPlaying);
  const canPlay = Boolean(spotifyTrack && !matchedDisconnected);

  return (
    <li
      key={getTrackKey(track) || `track-${index}`}
      className={[
        isActive ? "track-playing" : "",
        matchedDisconnected ? "track-matched-disconnected" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={(e) => handleTrackRowClick(e, isActive)}
      title={isActive ? "Click to seek" : undefined}
    >
      <div className="track-progress-bar" style={{ width: isActive ? `${progress}%` : "0" }} />
      <span className="track-position">{track.position || `${index + 1}.`}</span>
      <span className="track-title">{track.title}</span>
      {track.duration && <span className="track-duration">{track.duration}</span>}
      {spotifyTrack ? (
        <button
          className="play-track-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (!spotifyTrack.uri || !canPlay) return;
            if (isCurrentTrack) {
              togglePlayback();
            } else {
              playTrack(spotifyTrack.uri);
            }
          }}
          title={
            matchedDisconnected
              ? "Connect to Spotify to play"
              : isPlayingThisTrack
                ? `Pause ${spotifyTrack.name} by ${artists.map((a: SpotifyArtist) => a.name).join(", ")}`
                : `Play ${spotifyTrack.name} by ${artists.map((a: SpotifyArtist) => a.name).join(", ")}`
          }
          disabled={matchedDisconnected}
        >
          {isPlayingThisTrack ? "⏸ Pause" : "▶ Play"}
        </button>
      ) : matchExists ? (
        <span className="no-match">No match</span>
      ) : (
        <span className="no-match">Matching…</span>
      )}
      <button
        type="button"
        className={`track-spotify-search-btn${manualSpotifyMatch ? " track-spotify-search-btn--manual" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          onSpotifySearchClick(track.title);
        }}
        title={
          manualSpotifyMatch
            ? "Remove manual Spotify match (click to confirm)"
            : "Manually find a matching track on Spotify"
        }
        aria-label={
          manualSpotifyMatch
            ? "Remove manual Spotify match"
            : "Manually find a matching track on Spotify"
        }
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <path
            fill="currentColor"
            d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
          />
        </svg>
      </button>
      <button
        type="button"
        className={`track-like-btn track-like-${likeState}`}
        onClick={(e) => {
          e.stopPropagation();
          if (!matchedDisconnected) toggleLikeTrack(track);
        }}
        title={
          matchedDisconnected
            ? "Connect to Spotify to sync likes"
            : likeState === 0
              ? "Like"
              : likeState === 1
                ? "Liked (click for especially like)"
                : "Especially like (click to remove)"
        }
        aria-label={likeState === 0 ? "Like track" : likeState === 1 ? "Liked" : "Especially like"}
        disabled={matchedDisconnected}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      </button>
    </li>
  );
}
