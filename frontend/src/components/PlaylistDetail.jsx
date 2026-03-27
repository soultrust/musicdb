import { useMusicDbApp } from "../hooks/useMusicDbApp";

export default function PlaylistDetail() {
  const { playlistDetail: p } = useMusicDbApp();
  return (
    <div className="detail">
      {p.playlistTracksLoading && <p className="detail-loading">Loading playlist…</p>}
      {p.playlistTracksData && (
        <div className="detail-columns">
          <div className="detail-main">
            <div className="detail-header">
              <div className="detail-thumb-container">
                {p.playlistTracksData.images && p.playlistTracksData.images.length > 0 ? (
                  <img
                    src={p.playlistTracksData.images[0].url}
                    alt={p.playlistTracksData.name}
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
                <h2 className="detail-title">{p.playlistTracksData.name}</h2>
                <div className="detail-meta">
                  {p.playlistTracksData.owner && (
                    <div className="detail-row">
                      <span className="label">Owner:</span>
                      <span className="value">{p.playlistTracksData.owner}</span>
                    </div>
                  )}
                  {p.playlistTracksData.description && (
                    <div className="detail-row">
                      <span className="label">Description:</span>
                      <span className="value">{p.playlistTracksData.description}</span>
                    </div>
                  )}
                  {p.playlistTracksData.tracks && (
                    <div className="detail-row">
                      <span className="label">Tracks:</span>
                      <span className="value">{p.playlistTracksData.tracks.length}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {p.playlistTracksData.tracks && p.playlistTracksData.tracks.length > 0 && (
              <div className="detail-tracklist">
                <div className="tracklist-header">
                  <h3>Playlist Tracks</h3>
                </div>
                <ol className="tracklist">
                  {p.playlistTracksData.tracks.map((track, i) => {
                    const trackUri = track.uri;
                    const canPlay = trackUri && p.deviceId && p.spotifyToken;
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
                              onClick={() => p.playTrack(trackUri)}
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
