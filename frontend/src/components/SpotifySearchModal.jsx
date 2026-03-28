import { useSpotifySearchModalContext } from "../hooks/useMusicDbApp";

export default function SpotifySearchModal() {
  const s = useSpotifySearchModalContext();
  return (
    <div className="modal-overlay" onClick={s.closeSpotifySearchModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Search track on Spotify</h2>
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
            <p className="spotify-search-hint" id="spotify-search-intro-hint">
              Fields are pre-filled from the release you’re viewing. Clear <strong>Artist</strong> to
              search every artist, or <strong>Album</strong> to search every album; only non-empty
              fields limit the Spotify query.
            </p>

            <div className="spotify-search-field">
              <label htmlFor="spotify-search-query">Track title</label>
              <input
                id="spotify-search-query"
                type="text"
                value={s.spotifySearchQuery}
                onChange={(e) => s.setSpotifySearchQuery(e.target.value)}
                placeholder="Track title"
                disabled={s.spotifySearchLoading}
                autoFocus
                aria-describedby="spotify-search-intro-hint"
              />
            </div>

            <div className="spotify-search-field">
              <label htmlFor="spotify-search-artist">Artist</label>
              <input
                id="spotify-search-artist"
                type="text"
                value={s.spotifySearchArtist}
                onChange={(e) => s.setSpotifySearchArtist(e.target.value)}
                placeholder="Artist (optional)"
                disabled={s.spotifySearchLoading}
              />
            </div>

            <div className="spotify-search-field">
              <label htmlFor="spotify-search-album">Album</label>
              <input
                id="spotify-search-album"
                type="text"
                value={s.spotifySearchAlbum}
                onChange={(e) => s.setSpotifySearchAlbum(e.target.value)}
                placeholder="Blank = any album"
                disabled={s.spotifySearchLoading}
              />
            </div>

            <div className="spotify-search-submit-row">
              <button
                type="submit"
                className="spotify-search-submit"
                disabled={s.spotifySearchLoading || !s.spotifySearchQuery.trim()}
              >
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
                    {track.album?.name && (
                      <span className="spotify-search-result-album">{track.album.name}</span>
                    )}
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
