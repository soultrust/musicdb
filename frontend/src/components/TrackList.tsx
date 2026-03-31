import TrackRow from "./TrackRow";
import { useDetailShellContext, useDetailTracklistContext, useHeaderContext } from "../hooks/useMusicDbApp";
import {
  findSpotifyMatchForTrackTitle,
  isManualSpotifyMatchRow,
} from "../utils/spotifyTrackMatch";

export default function TrackList() {
  const { isPlaying, togglePlayback } = useHeaderContext();
  const { detailData } = useDetailShellContext();
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
  } = useDetailTracklistContext();

  const tracklist = detailData?.tracklist ?? [];

  return (
    <div className="detail-tracklist">
      <div className="tracklist-header">
        <h3>
          Tracklist{" "}
          {spotifyMatching && <span className="matching-indicator">(Matching to Spotify…)</span>}
        </h3>
        <div className="tracklist-header-right">
          <label className="autoplay-switch">
            <input
              type="checkbox"
              checked={autoplay}
              onChange={(e) => setAutoplay(e.target.checked)}
              role="switch"
              aria-label="Autoplay next track"
            />
            <span className="autoplay-switch-track">
              <span className="autoplay-switch-thumb" />
            </span>
            <span className="autoplay-switch-label">Autoplay</span>
          </label>
          <div
            className={`tracklist-filter${tracklistFilter === null ? " tracklist-filter-all-active" : ""}${tracklistFilter === "liked" ? " tracklist-filter-both-active" : ""}`}
          >
            <span className="tracklist-filter-label">Filter by:</span>
            <button
              type="button"
              className={`tracklist-filter-star track-like-btn track-like-0${tracklistFilter === null ? " tracklist-filter-star-active" : ""}`}
              onClick={() => setTracklistFilter(null)}
              title="Show all tracks"
              aria-label="Show all tracks"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
            <button
              type="button"
              className={`tracklist-filter-star track-like-btn track-like-1${tracklistFilter === "liked" ? " tracklist-filter-star-active" : ""}`}
              onClick={() => setTracklistFilter((f) => (f === "liked" ? null : "liked"))}
              title={tracklistFilter === "liked" ? "Show all tracks" : "Hide unliked tracks"}
              aria-label={tracklistFilter === "liked" ? "Show all" : "Filter to liked"}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
            <button
              type="button"
              className={`tracklist-filter-star track-like-btn track-like-2${tracklistFilter === "especially" ? " tracklist-filter-star-active" : ""}`}
              onClick={() => setTracklistFilter((f) => (f === "especially" ? null : "especially"))}
              title={
                tracklistFilter === "especially"
                  ? "Show all tracks"
                  : "Hide unliked and liked (show especially liked only)"
              }
              aria-label={tracklistFilter === "especially" ? "Show all" : "Filter to especially liked"}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <ol className="tracklist">
        {tracklist
          .filter((track) => {
            if (!tracklistFilter) return true;
            const state = getDisplayLikeState(track);
            if (tracklistFilter === "liked") return state >= 1;
            if (tracklistFilter === "especially") return state === 2;
            return true;
          })
          .map((track, i) => {
            const match = findSpotifyMatchForTrackTitle(spotifyMatches, track.title);
            const spotifyTrack = match?.spotify_track;
            const isCurrentTrack = Boolean(
              spotifyTrack?.uri &&
                currentTrack?.uri &&
                spotifyTrack.uri === currentTrack.uri,
            );
            const isTrackFinished = playbackDuration > 0 && playbackPosition >= playbackDuration;
            const isActive = Boolean(isCurrentTrack && !isTrackFinished);
            const progress = playbackDuration > 0 ? (playbackPosition / playbackDuration) * 100 : 0;
            const likeState = getDisplayLikeState(track);
            const matchedDisconnected = Boolean(spotifyTrack && !spotifyToken);
            const manualSpotifyMatch = match ? isManualSpotifyMatchRow(match) : false;

            return (
              <TrackRow
                key={getTrackKey(track) || `track-${i}`}
                track={track}
                index={i}
                spotifyTrack={spotifyTrack}
                matchExists={match !== undefined}
                isCurrentTrack={isCurrentTrack}
                manualSpotifyMatch={manualSpotifyMatch}
                isActive={isActive}
                progress={progress}
                likeState={likeState}
                matchedDisconnected={matchedDisconnected}
                getTrackKey={getTrackKey}
                handleTrackRowClick={handleTrackRowClick}
                playTrack={playTrack}
                isPlaying={isPlaying}
                onSpotifySearchClick={handleSpotifySearchButtonClick}
                toggleLikeTrack={toggleLikeTrack}
                togglePlayback={togglePlayback}
              />
            );
          })}
      </ol>
    </div>
  );
}
