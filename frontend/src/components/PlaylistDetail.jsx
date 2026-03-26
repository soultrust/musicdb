export default function PlaylistDetail({
  playlistTracksLoading,
  playlistTracksData,
  deviceId,
  spotifyToken,
  playTrack,
}) {
  return (
    <div className="detail">
      {playlistTracksLoading && <p className="detail-loading">Loading playlist…</p>}
      {playlistTracksData && (
        <div className="detail-columns">
          <div className="detail-main">
            <div className="detail-header">
              <div className="detail-thumb-container">
                {playlistTracksData.images && playlistTracksData.images.length > 0 ? (
                  <img
                    src={playlistTracksData.images[0].url}
                    alt={playlistTracksData.name}
                    className="detail-thumb"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="detail-thumb-placeholder">No Image</div>
                )}
              </div>
              <div className="detail-content">
                <h2 className="detail-title">{playlistTracksData.name}</h2>
                <div className="detail-meta">
                  {playlistTracksData.owner && (
                    <div className="detail-row">
                      <span className="label">Owner:</span>
                      <span className="value">{playlistTracksData.owner}</span>
                    </div>
                  )}
                  {playlistTracksData.description && (
                    <div className="detail-row">
                      <span className="label">Description:</span>
                      <span className="value">{playlistTracksData.description}</span>
                    </div>
                  )}
                  {playlistTracksData.tracks && (
                    <div className="detail-row">
                      <span className="label">Tracks:</span>
                      <span className="value">{playlistTracksData.tracks.length}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {playlistTracksData.tracks && playlistTracksData.tracks.length > 0 && (
              <div className="detail-tracklist">
                <div className="tracklist-header">
                  <h3>Playlist Tracks</h3>
                </div>
                <ol className="tracklist">
                  {playlistTracksData.tracks.map((track, i) => {
                    const trackUri = track.uri;
                    const canPlay = trackUri && deviceId && spotifyToken;
                    return (
                      <li key={track.id || i} className="tracklist-item">
                        <div className="tracklist-item-content">
                          <span className="track-position">{i + 1}</span>
                          <div className="track-info">
                            <span className="track-title">{track.name}</span>
                            <span className="track-artist">
                              {track.artists.map((a) => a.name).join(", ")}
                              {track.album && ` • ${track.album}`}
                            </span>
                          </div>
                          {canPlay && (
                            <button
                              onClick={() => playTrack(trackUri)}
                              className="track-play-btn"
                              title={`Play ${track.name}`}
                            >
                              ▶
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

