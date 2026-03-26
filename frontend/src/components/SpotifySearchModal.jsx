export default function SpotifySearchModal({
  closeSpotifySearchModal,
  handleSpotifySearch,
  spotifySearchQuery,
  setSpotifySearchQuery,
  spotifySearchLoading,
  spotifySearchResults,
  handleSelectSpotifyTrack,
  spotifySearchFetched,
}) {
  return (
    <div className="modal-overlay" onClick={closeSpotifySearchModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Search Track on Spotify</h2>
          <button
            type="button"
            className="modal-close"
            onClick={closeSpotifySearchModal}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={handleSpotifySearch} className="spotify-search-form">
            <label htmlFor="spotify-search-query">Search for a track</label>
            <div className="spotify-search-input-group">
              <input
                id="spotify-search-query"
                type="text"
                value={spotifySearchQuery}
                onChange={(e) => setSpotifySearchQuery(e.target.value)}
                placeholder="Track name or artist"
                disabled={spotifySearchLoading}
                autoFocus
              />
              <button
                type="submit"
                disabled={spotifySearchLoading || !spotifySearchQuery.trim()}
              >
                {spotifySearchLoading ? "Searching…" : "Search"}
              </button>
            </div>
          </form>
          {spotifySearchResults.length > 0 && (
            <ul className="spotify-search-results">
              {spotifySearchResults.map((track) => (
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
                    onClick={() => handleSelectSpotifyTrack(track)}
                  >
                    Select
                  </button>
                </li>
              ))}
            </ul>
          )}
          {spotifySearchFetched && !spotifySearchLoading && spotifySearchResults.length === 0 && (
            <p className="detail-loading">No results. Try a different search.</p>
          )}
        </div>
      </div>
    </div>
  );
}

