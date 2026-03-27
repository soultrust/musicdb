import { useMusicDbApp } from "../hooks/useMusicDbApp";

export default function SpotifySearchModal() {
  const { spotifySearchModal: s } = useMusicDbApp();
  return (
    <div className="modal-overlay" onClick={s.closeSpotifySearchModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Search Track on Spotify</h2>
          <button
            type="button"
            className="modal-close"
            onClick={s.closeSpotifySearchModal}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={s.handleSpotifySearch} className="spotify-search-form">
            <label htmlFor="spotify-search-query">Search for a track</label>
            <div className="spotify-search-input-group">
              <input
                id="spotify-search-query"
                type="text"
                value={s.spotifySearchQuery}
                onChange={(e) => s.setSpotifySearchQuery(e.target.value)}
                placeholder="Track name or artist"
                disabled={s.spotifySearchLoading}
                autoFocus
              />
              <button type="submit" disabled={s.spotifySearchLoading || !s.spotifySearchQuery.trim()}>
                {s.spotifySearchLoading ? "Searching…" : "Search"}
              </button>
            </div>
          </form>
          {s.spotifySearchResults.length > 0 && (
            <ul className="spotify-search-results">
              {s.spotifySearchResults.map((track) => (
                <li key={track.id || track.uri} className="spotify-search-result-item">
                  <div className="spotify-search-result-info">
                    <span className="spotify-search-result-name">{track.name}</span>
                    <span className="spotify-search-result-artist">
                      {track.artists?.map((a) => a.name).join(", ")}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="spotify-search-select-btn"
                    onClick={() => s.handleSelectSpotifyTrack(track)}
                  >
                    Select
                  </button>
                </li>
              ))}
            </ul>
          )}
          {s.spotifySearchFetched && !s.spotifySearchLoading && s.spotifySearchResults.length === 0 && (
            <p className="detail-loading">No results. Try a different search.</p>
          )}
        </div>
      </div>
    </div>
  );
}
