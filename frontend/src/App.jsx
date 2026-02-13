import { useState, useEffect, useRef } from "react";
import "./App.css";

const API_BASE = "http://127.0.0.1:8000";
const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || "";
const SPOTIFY_REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI || "http://127.0.0.1:3000";

/** Parse JSON from response; if server returned HTML (error page), throw a clear error. */
async function parseJsonResponse(res, url) {
  const text = await res.text();
  const trimmed = text.trim();
  if (trimmed.startsWith("<") || trimmed.toLowerCase().startsWith("<!doctype")) {
    throw new Error(
      res.ok
        ? "Server returned HTML instead of JSON."
        : `Server error (${res.status}). Is the Django API running at ${API_BASE}?`
    );
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    throw new Error("Invalid JSON from server: " + (e.message || "Unknown error"));
  }
}

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
  const [deviceId, setDeviceId] = useState(null);
  const playerRef = useRef(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const res = await fetch(`${API_BASE}/api/search/?q=${encodeURIComponent(query.trim())}`);
      const data = await parseJsonResponse(res, "/api/search/");
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
      const data = await parseJsonResponse(res, "/api/search/detail/");
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

      const data = await parseJsonResponse(res, "/api/spotify/match-tracks/");
      if (res.ok) {
        console.log("Spotify matches received:", data.matches);
        setSpotifyMatches(data.matches || []);
      } else {
        console.error("Match tracks API error:", data);
      }
    } catch (err) {
      console.error("Failed to match tracks:", err);
    } finally {
      setSpotifyMatching(false);
    }
  }

  function handleSpotifyLogin(e) {
    e?.preventDefault?.();
    
    if (!SPOTIFY_CLIENT_ID) {
      console.error("Spotify Client ID not configured. Please set VITE_SPOTIFY_CLIENT_ID in frontend/.env");
      return;
    }

    const scopes = "streaming user-read-email user-read-private";
    const redirectUriEncoded = encodeURIComponent(SPOTIFY_REDIRECT_URI);
    // Use authorization code flow instead of implicit grant
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri=${redirectUriEncoded}&scope=${encodeURIComponent(scopes)}`;
    
    console.log("=== Spotify Login Debug ===");
    console.log("Client ID:", SPOTIFY_CLIENT_ID);
    console.log("Redirect URI:", SPOTIFY_REDIRECT_URI);
    console.log("Full Auth URL:", authUrl);
    console.log("===========================");
    
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
    // Handle OAuth callback - check for authorization code in query params
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const error = urlParams.get("error");
    
    console.log("Checking OAuth callback - code:", code ? "Found" : "Not found", "error:", error);
    
      if (error) {
        console.error("Spotify OAuth error:", error);
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }
    
    if (code) {
      console.log("Exchanging authorization code for token...");
      // Clean up URL immediately to prevent retries
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Exchange code for token via Django backend
      fetch(`${API_BASE}/api/spotify/callback/?code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(SPOTIFY_REDIRECT_URI)}`)
        .then(res => parseJsonResponse(res, "/api/spotify/callback/"))
        .then(data => {
          if (data.access_token) {
            console.log("Token received, setting Spotify token");
            setSpotifyToken(data.access_token);
          } else {
            console.error("Failed to get token:", data);
          }
        })
        .catch(err => {
          console.error("Token exchange error (Django may not be running):", err.message);
        });
    } else {
      // Check if token exists in localStorage
      const savedToken = localStorage.getItem("spotify_token");
      if (savedToken) {
        console.log("Found saved token in localStorage");
        setSpotifyToken(savedToken);
      }
    }
  }, []);

  useEffect(() => {
    if (spotifyToken) {
      localStorage.setItem("spotify_token", spotifyToken);

      // Load Spotify Web Playback SDK dynamically
      if (!window.Spotify && !document.getElementById("spotify-player-script")) {
        const script = document.createElement("script");
        script.id = "spotify-player-script";
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.async = true;
        document.body.appendChild(script);

        script.onload = () => {
          initializePlayer();
        };
      } else if (window.Spotify && !playerRef.current) {
        initializePlayer();
      }
    }

    function initializePlayer() {
      if (!window.Spotify || playerRef.current) return;

      const newPlayer = new window.Spotify.Player({
        name: "Soultrust Music DB",
        getOAuthToken: (cb) => cb(spotifyToken),
        volume: 0.5,
      });

      newPlayer.addListener("ready", ({ device_id }) => {
        console.log("Spotify player ready, device_id:", device_id);
        setDeviceId(device_id);
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
  }, [spotifyToken]);

  async function playTrack(spotifyUri) {
    console.log("playTrack called with URI:", spotifyUri);
    console.log("player:", player, "spotifyToken:", spotifyToken ? "exists" : "missing", "deviceId:", deviceId);
    
    if (!player || !spotifyToken) {
      console.error("Please log in to Spotify first");
      return;
    }

    if (!deviceId) {
      console.error("Device ID not ready yet. Waiting for player to initialize...");
      return;
    }

    try {
      console.log("Calling Spotify API to play track...");
      const response = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${spotifyToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uris: [spotifyUri] }),
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error("Spotify play API error:", response.status, errorData);
      } else {
        console.log("Play request sent successfully");
      }
    } catch (err) {
      console.error("Failed to play track:", err);
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
        <h1>MusicBrainz Search</h1>
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
          placeholder="Search albums, EPs, singles…"
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
                            View on MusicBrainz →
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
                                onClick={() => {
                                  console.log("Play button clicked for:", spotifyTrack.uri);
                                  playTrack(spotifyTrack.uri);
                                }}
                                title={`Play ${spotifyTrack.name} by ${spotifyTrack.artists.map((a) => a.name).join(", ")}`}
                              >
                                ▶ Play
                              </button>
                            ) : match !== undefined ? (
                              <span className="no-match">No match</span>
                            ) : (
                              <span className="no-match">Matching…</span>
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
