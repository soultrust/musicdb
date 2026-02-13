import { useState, useEffect, useRef } from "react";
import "./App.css";

const API_BASE = "http://localhost:8000";
const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || "";
const SPOTIFY_REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || "http://127.0.0.1:3000";


function App() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [spotifyMatches, setSpotifyMatches] = useState([]);
  const [spotifyMatching, setSpotifyMatching] = useState(false);
  const [spotifyToken, setSpotifyToken] = useState(null);
  const [player, setPlayer] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const playerRef = useRef(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const res = await fetch(`${API_BASE}/api/search/?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Request failed: ${res.status}`);
        return;
      }
      setResults(data.results || []);
      setSelectedItem(null);
      setDetailData(null);
      setSpotifyMatches([]);
    } catch (err) {
      setError(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleItemClick(item) {
    setSelectedItem(item);
    setDetailData(null);
    setDetailError(null);

    if (!item.id || !item.type) {
      setDetailError("Item missing id or type");
      return;
    }

    setDetailLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/search/detail/?type=${encodeURIComponent(item.type)}&id=${encodeURIComponent(item.id)}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setDetailError(data.error || `Request failed: ${res.status}`);
        return;
      }
      setDetailData(data);

      // If it's a release with tracks, match them to Spotify
      if (data.tracklist && data.tracklist.length > 0 && data.artists) {
        matchTracksToSpotify(data.tracklist, data.artists);
      }
    } catch (err) {
      setDetailError(err.message || "Request failed");
    } finally {
      setDetailLoading(false);
    }
  }

  async function matchTracksToSpotify(tracklist, artists) {
    setSpotifyMatching(true);
    try {
      const tracks = tracklist.map((track) => ({
        title: track.title,
        artists: artists.map((a) => a.name),
      }));

      const res = await fetch(`${API_BASE}/api/spotify/match-tracks/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracks }),
      });

      const data = await res.json();
      if (res.ok) {
        setSpotifyMatches(data.matches || []);
      }
    } catch (err) {
      console.error("Failed to match tracks:", err);
    } finally {
      setSpotifyMatching(false);
    }
  }

  function handleSpotifyLogin() {
    if (!SPOTIFY_CLIENT_ID) {
      alert("Spotify Client ID not configured. Please set VITE_SPOTIFY_CLIENT_ID in frontend/.env");
      return;
    }

    // Show what we're sending for debugging
    const debugInfo = `Client ID: ${SPOTIFY_CLIENT_ID}\nRedirect URI: ${SPOTIFY_REDIRECT_URI}\n\nPlease verify these match your Spotify Dashboard exactly.`;
    console.log(debugInfo);
    
    const scopes = "streaming user-read-email user-read-private";
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(SPOTIFY_REDIRECT_URI)}&scope=${encodeURIComponent(scopes)}`;
    console.log("Full auth URL:", authUrl);
    window.location.href = authUrl;
  }

  function handleSpotifyLogout() {
    setSpotifyToken(null);
    setPlayer(null);
    setIsPlaying(false);
    setCurrentTrack(null);
    if (playerRef.current) {
      playerRef.current.disconnect();
      playerRef.current = null;
    }
    window.location.hash = "";
  }

  useEffect(() => {
    // Handle OAuth callback
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get("access_token");
      if (token) {
        setSpotifyToken(token);
        window.location.hash = "";
      }
    } else {
      // Check if token exists in localStorage
      const savedToken = localStorage.getItem("spotify_token");
      if (savedToken) {
        setSpotifyToken(savedToken);
      }
    }
  }, []);

  useEffect(() => {
    if (spotifyToken) {
      localStorage.setItem("spotify_token", spotifyToken);

      // Initialize Spotify Web Playback SDK
      if (window.Spotify && !playerRef.current) {
        const newPlayer = new window.Spotify.Player({
          name: "Discogs Music DB",
          getOAuthToken: (cb) => cb(spotifyToken),
          volume: 0.5,
        });

        newPlayer.addListener("ready", ({ device_id }) => {
          console.log("Spotify player ready:", device_id);
        });

        newPlayer.addListener("player_state_changed", (state) => {
          if (state) {
            setIsPlaying(!state.paused);
            setCurrentTrack(state.track_window.current_track);
          }
        });

        newPlayer.connect();
        setPlayer(newPlayer);
        playerRef.current = newPlayer;
      }
    }
  }, [spotifyToken]);

  async function playTrack(spotifyUri) {
    if (!player || !spotifyToken) {
      alert("Please log in to Spotify first");
      return;
    }

    try {
      await fetch(`https://api.spotify.com/v1/me/player/play`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${spotifyToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uris: [spotifyUri] }),
      });
    } catch (err) {
      console.error("Failed to play track:", err);
      alert("Failed to play track. Make sure Spotify is open.");
    }
  }

  function togglePlayback() {
    if (player) {
      player.togglePlay();
    }
  }

  return (
    <div className="app">
      <div className="app-header">
        <h1>Discogs Search</h1>
        {spotifyToken ? (
          <div className="spotify-controls">
            <span className="spotify-status">Spotify Connected</span>
            <button onClick={togglePlayback} className="play-pause-btn" disabled={!currentTrack}>
              {isPlaying ? "⏸" : "▶"}
            </button>
            <button onClick={handleSpotifyLogout} className="spotify-logout-btn">
              Logout
            </button>
          </div>
        ) : (
          <button onClick={handleSpotifyLogin} className="spotify-login-btn">
            Login to Spotify
          </button>
        )}
      </div>
      <form onSubmit={handleSubmit} className="search-form">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search releases, artists, labels…"
          disabled={loading}
          autoFocus
        />
        <button type="submit" disabled={loading}>
          {loading ? "Searching…" : "Search"}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      <div className="content">
        <ul className="results">
          {results.map((item, i) => (
            <li
              key={item.id != null ? `${item.type}-${item.id}` : i}
              className={selectedItem?.id === item.id ? "selected" : ""}
              onClick={() => handleItemClick(item)}
            >
              {item.title}
            </li>
          ))}
        </ul>
        {selectedItem && (
          <div className="detail">
            {detailLoading && <p className="detail-loading">Loading details…</p>}
            {detailError && <p className="error">{detailError}</p>}
            {detailData && (
              <>
                <div className="detail-header">
                  <div className="detail-thumb-container">
                    {detailData.thumb || detailData.images?.[0]?.uri ? (
                      <img
                        src={detailData.thumb || detailData.images?.[0]?.uri}
                        alt={detailData.title || selectedItem.title}
                        className="detail-thumb"
                        onError={(e) => {
                          console.error(
                            "Image failed to load:",
                            detailData.thumb || detailData.images?.[0]?.uri,
                          );
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="detail-thumb-placeholder">No Image</div>
                    )}
                  </div>
                  <div className="detail-content">
                    <h2>{detailData.title || selectedItem.title}</h2>
                    <div className="detail-meta">
                      {detailData.artists && detailData.artists.length > 0 && (
                        <div className="detail-row">
                          <span className="label">Artist:</span>
                          <span className="value">
                            {detailData.artists.map((a) => a.name).join(", ")}
                          </span>
                        </div>
                      )}
                      {detailData.year && (
                        <div className="detail-row">
                          <span className="label">Year:</span>
                          <span className="value">{detailData.year}</span>
                        </div>
                      )}
                      {detailData.formats && detailData.formats.length > 0 && (
                        <div className="detail-row">
                          <span className="label">Format:</span>
                          <span className="value">
                            {detailData.formats
                              .map((f) => f.name + (f.qty ? ` (${f.qty})` : ""))
                              .join(", ")}
                          </span>
                        </div>
                      )}
                      {detailData.country && (
                        <div className="detail-row">
                          <span className="label">Country:</span>
                          <span className="value">{detailData.country}</span>
                        </div>
                      )}
                      {detailData.genres && detailData.genres.length > 0 && (
                        <div className="detail-row">
                          <span className="label">Genre:</span>
                          <span className="value">{detailData.genres.join(", ")}</span>
                        </div>
                      )}
                      {detailData.styles && detailData.styles.length > 0 && (
                        <div className="detail-row">
                          <span className="label">Style:</span>
                          <span className="value">{detailData.styles.join(", ")}</span>
                        </div>
                      )}
                      {detailData.labels && detailData.labels.length > 0 && (
                        <div className="detail-row">
                          <span className="label">Label:</span>
                          <span className="value">
                            {detailData.labels
                              .map((l) => l.name + (l.catno ? ` (${l.catno})` : ""))
                              .join(", ")}
                          </span>
                        </div>
                      )}
                      {detailData.uri && (
                        <div className="detail-row">
                          <a
                            href={detailData.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="detail-link"
                          >
                            View on Discogs →
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {detailData.tracklist && detailData.tracklist.length > 0 && (
                  <div className="detail-tracklist">
                    <h3>
                      Tracklist{" "}
                      {spotifyMatching && (
                        <span className="matching-indicator">(Matching to Spotify…)</span>
                      )}
                    </h3>
                    <ol className="tracklist">
                      {detailData.tracklist.map((track, i) => {
                        const match = spotifyMatches.find((m) => m.discogs_title === track.title);
                        const spotifyTrack = match?.spotify_track;
                        return (
                          <li key={i}>
                            <span className="track-position">{track.position || `${i + 1}.`}</span>
                            <span className="track-title">{track.title}</span>
                            {track.duration && (
                              <span className="track-duration">{track.duration}</span>
                            )}
                            {spotifyTrack ? (
                              <button
                                className="play-track-btn"
                                onClick={() => playTrack(spotifyTrack.uri)}
                                title={`Play ${spotifyTrack.name} by ${spotifyTrack.artists.map((a) => a.name).join(", ")}`}
                              >
                                ▶ Play
                              </button>
                            ) : (
                              match !== undefined && <span className="no-match">No match</span>
                            )}
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                )}
                {detailData.profile && (
                  <div className="detail-profile">
                    <h3>Profile</h3>
                    <p>{detailData.profile}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
