import { useMusicDbApp } from "../hooks/useMusicDbApp";

export default function AppHeader() {
  const { header: h } = useMusicDbApp();
  return (
    <div className="app-header">
      <h1>
        MusicDB <span className="app-header-subtitle">MusicBrainz</span>
      </h1>
      <div className="app-header-right">
        {h.spotifyToken ? (
          <div className="spotify-controls">
            <span
              className={`spotify-status ${
                h.spotifyConnectionStatus === "connected"
                  ? "spotify-connected"
                  : h.spotifyConnectionStatus === "connecting"
                    ? "spotify-connecting"
                    : "spotify-disconnected"
              }`}
            >
              {h.spotifyConnectionStatus === "connected" && h.deviceId
                ? "Spotify Connected"
                : h.spotifyConnectionStatus === "connecting"
                  ? "Spotify Connecting..."
                  : "Spotify Reconnecting..."}
            </span>
            {h.spotifyConnectionStatus === "connected" && h.deviceId && (
              <button
                onClick={h.togglePlayback}
                className="play-pause-btn"
                disabled={!h.currentTrack}
              >
                {h.isPlaying ? "⏸" : "▶"}
              </button>
            )}
          </div>
        ) : (
          <button onClick={h.handleSpotifyLogin} className="spotify-login-btn">
            Connect to Spotify
          </button>
        )}
        <select
          className="view-list-select"
          value={h.viewListId ?? ""}
          onChange={h.onViewListChange}
          title="Select a list to view"
        >
          <option value="">— Select a list —</option>
          {h.spotifyToken && <option value="spotify-playlists">Shared Playlists</option>}
          {[
            { label: "Releases", list_type: "release" },
            { label: "Artists", list_type: "person" },
          ].map(({ label, list_type }) => {
            const groupLists = (h.allListsForView || []).filter((l) => l.list_type === list_type);
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
        <button onClick={h.logout} className="app-logout-btn" title="Log out of the app">
          Log out
        </button>
      </div>
    </div>
  );
}
