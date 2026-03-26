export default function AppHeader({
  spotifyToken,
  spotifyConnectionStatus,
  deviceId,
  isPlaying,
  currentTrack,
  togglePlayback,
  handleSpotifyLogin,
  viewListId,
  onViewListChange,
  allListsForView,
  logout,
}) {
  return (
    <div className="app-header">
      <h1>
        MusicDB <span className="app-header-subtitle">MusicBrainz</span>
      </h1>
      <div className="app-header-right">
        {spotifyToken ? (
          <div className="spotify-controls">
            <span
              className={`spotify-status ${
                spotifyConnectionStatus === "connected"
                  ? "spotify-connected"
                  : spotifyConnectionStatus === "connecting"
                    ? "spotify-connecting"
                    : "spotify-disconnected"
              }`}
            >
              {spotifyConnectionStatus === "connected" && deviceId
                ? "Spotify Connected"
                : spotifyConnectionStatus === "connecting"
                  ? "Spotify Connecting..."
                  : "Spotify Reconnecting..."}
            </span>
            {spotifyConnectionStatus === "connected" && deviceId && (
              <button
                onClick={togglePlayback}
                className="play-pause-btn"
                disabled={!currentTrack}
              >
                {isPlaying ? "⏸" : "▶"}
              </button>
            )}
          </div>
        ) : (
          <button onClick={handleSpotifyLogin} className="spotify-login-btn">
            Connect to Spotify
          </button>
        )}
        <select
          className="view-list-select"
          value={viewListId ?? ""}
          onChange={onViewListChange}
          title="Select a list to view"
        >
          <option value="">— Select a list —</option>
          {spotifyToken && <option value="spotify-playlists">Shared Playlists</option>}
          {[
            { label: "Releases", list_type: "release" },
            { label: "Artists", list_type: "person" },
          ].map(({ label, list_type }) => {
            const groupLists = (allListsForView || []).filter(
              (l) => l.list_type === list_type,
            );
            if (groupLists.length === 0) return null;
            return (
              <optgroup key={list_type} label={label}>
                {groupLists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
        <button onClick={logout} className="app-logout-btn" title="Log out of the app">
          Log out
        </button>
      </div>
    </div>
  );
}

