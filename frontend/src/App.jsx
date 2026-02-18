import { useState, useEffect, useRef } from "react";
import "./App.css";

// API base URL from environment variable
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
console.log('API_BASE being used:', API_BASE);
const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || "";
// Remove trailing slash from redirect URI to match Spotify's exact matching requirement
const SPOTIFY_REDIRECT_URI = (import.meta.env.VITE_SPOTIFY_REDIRECT_URI || "http://127.0.0.1:3000").replace(/\/$/, '');
const LIKED_TRACKS_KEY = "soultrust_liked_tracks";
const AUTH_REFRESH_KEY = "soultrust_refresh_token";

function App() {
  const [accessToken, setAccessToken] = useState(null);
  const [_user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState(null);
  const [spotifyMatches, setSpotifyMatches] = useState([]);
  const [spotifyMatching, setSpotifyMatching] = useState(false);
  const [spotifyToken, setSpotifyToken] = useState(null);
  const [player, setPlayer] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [deviceId, setDeviceId] = useState(null);
  const playerRef = useRef(null);
  const [likedTracks, setLikedTracks] = useState(() => {
    try {
      const stored = localStorage.getItem(LIKED_TRACKS_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });
  const [autoplay, setAutoplay] = useState(true);
  const autoplayTriggeredRef = useRef(false);
  const lastPlayedTrackRef = useRef(null);
  const [trackJustEndedUri, setTrackJustEndedUri] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [showListModal, setShowListModal] = useState(false);
  const [lists, setLists] = useState([]);
  const [selectedListIds, setSelectedListIds] = useState([]);
  const [newListName, setNewListName] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState(null);

  function logout() {
    setAccessToken(null);
    setUser(null);
    setAuthError(null);
    localStorage.removeItem(AUTH_REFRESH_KEY);
  }

  async function authFetch(url, options = {}) {
    const headers = { ...options.headers };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    let res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      const refresh = localStorage.getItem(AUTH_REFRESH_KEY);
      if (refresh) {
        const refreshRes = await fetch(`${API_BASE}/api/auth/token/refresh/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh }),
        });
        const refreshData = await refreshRes.json();
        if (refreshData.access) {
          setAccessToken(refreshData.access);
          const retryHeaders = { ...options.headers, Authorization: `Bearer ${refreshData.access}` };
          res = await fetch(url, { ...options, headers: retryHeaders });
        }
      }
      if (res.status === 401) logout();
    }
    return res;
  }

  async function handleAuthSubmit(e) {
    e.preventDefault();
    setAuthError(null);
    const email = (authEmail || "").trim().toLowerCase();
    const password = authPassword;
    if (!email || !password) {
      setAuthError("Email and password are required.");
      return;
    }
    setAuthLoading(true);
    try {
      const endpoint = authMode === "register" ? `${API_BASE}/api/auth/register/` : `${API_BASE}/api/auth/login/`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || "Something went wrong.");
        return;
      }
      if (data.access) setAccessToken(data.access);
      if (data.refresh) localStorage.setItem(AUTH_REFRESH_KEY, data.refresh);
      if (data.user) setUser(data.user);
      setAuthError(null);
    } catch (err) {
      setAuthError(err.message || "Request failed.");
    } finally {
      setAuthLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const refresh = localStorage.getItem(AUTH_REFRESH_KEY);
      if (!refresh) return;
      const res = await fetch(`${API_BASE}/api/auth/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (cancelled || !res.ok) {
        if (!res.ok) localStorage.removeItem(AUTH_REFRESH_KEY);
        return;
      }
      const data = await res.json();
      if (data.access) setAccessToken(data.access);
    })();
    return () => { cancelled = true; };
  }, []);

  // Removed consumed list loading - replaced with lists feature

  async function handleSubmit(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const searchRes = await authFetch(`${API_BASE}/api/search/?q=${encodeURIComponent(query.trim())}`);
      const data = await searchRes.json();
      if (!searchRes.ok) {
        setError(data.error || `Request failed: ${searchRes.status}`);
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
    setOverview(null);
    setOverviewError(null);

    if (!item.id || !item.type) {
      setDetailError("Item missing id or type");
      return;
    }

    setDetailLoading(true);
    try {
      const res = await authFetch(
        `${API_BASE}/api/search/detail/?type=${encodeURIComponent(item.type)}&id=${encodeURIComponent(item.id)}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setDetailError(data.error || `Request failed: ${res.status}`);
        return;
      }
      setDetailData(data);
      // Removed consumed state

      // If it's a release with tracks, match them to Spotify
      if (data.tracklist && data.tracklist.length > 0 && data.artists) {
        matchTracksToSpotify(data.tracklist, data.artists);
      }

      // Fetch AI overview if we have title and artist
      const album = data.title || "";
      const artist = data.artists?.length ? data.artists.map((a) => a.name).join(", ") : "";
      if (album && artist) {
        setOverviewLoading(true);
        setOverviewError(null);
        try {
          const ovRes = await authFetch(
            `${API_BASE}/api/search/album-overview/?album=${encodeURIComponent(album)}&artist=${encodeURIComponent(artist)}`
          );
          const text = await ovRes.text();
          if (text.trim().startsWith("<")) {
            setOverviewError("Overview unavailable (server error). Is the Django API running?");
          } else {
            try {
              const ovData = JSON.parse(text);
              if (ovRes.ok && ovData?.data?.overview) {
                setOverview(ovData.data.overview);
              } else if (!ovRes.ok && ovData?.error) {
                setOverviewError(ovData.error);
              }
            } catch (e) {
              setOverviewError("Could not load overview.");
            }
          }
        } catch (err) {
          setOverviewError(err.message || "Failed to load overview");
        } finally {
          setOverviewLoading(false);
        }
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

      const res = await authFetch(`${API_BASE}/api/spotify/match-tracks/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracks }),
      });

      const data = await res.json();
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
    console.log('Spotify Redirect URI being used:', SPOTIFY_REDIRECT_URI);
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri=${redirectUriEncoded}&scope=${encodeURIComponent(scopes)}`;
    
    // Open in popup so the main page stays visible
    const popup = window.open(authUrl, "spotify-auth", "width=500,height=700,scrollbars=yes");
    if (!popup) {
      // Fallback if popup blocked
      window.location.href = authUrl;
    }
  }

  function handleSpotifyLogout() {
    setSpotifyToken(null);
    setPlayer(null);
    setIsPlaying(false);
    setCurrentTrack(null);
    setPlaybackPosition(0);
    setPlaybackDuration(0);
    if (playerRef.current) {
      playerRef.current.disconnect();
      playerRef.current = null;
    }
    window.location.hash = "";
  }

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const error = urlParams.get("error");
    const isPopup = window.opener != null;

    // OAuth callback (popup or redirect)
    if (error) {
      if (isPopup && window.opener) {
        window.opener.postMessage({ type: "spotify-auth-error", error }, window.location.origin);
        window.close();
      } else {
        setSpotifyToken(null);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      return;
    }

    if (code) {
      window.history.replaceState({}, document.title, window.location.pathname);
      
      fetch(`${API_BASE}/api/spotify/callback/?code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(SPOTIFY_REDIRECT_URI)}`)
        .then(async res => {
          const contentType = res.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            const text = await res.text();
            throw new Error(`Expected JSON but got ${contentType}. Response: ${text.substring(0, 200)}`);
          }
          return res.json();
        })
        .then(data => {
          if (data.access_token) {
            if (isPopup && window.opener) {
              window.opener.postMessage({ type: "spotify-token", token: data.access_token }, window.location.origin);
              window.close();
            } else {
              setSpotifyToken(data.access_token);
            }
          } else if (isPopup) {
            window.opener?.postMessage({ type: "spotify-auth-error", error: data.error || "Failed to get token" }, window.location.origin);
            window.close();
          }
        })
        .catch(err => {
          if (isPopup && window.opener) {
            window.opener.postMessage({ type: "spotify-auth-error", error: err.message }, window.location.origin);
            window.close();
          }
        });
      return;
    }

    // Not a callback: clear stale state on fresh load
    if (!isPopup) {
      setSpotifyToken(null);
      setPlayer(null);
      setDeviceId(null);
      setIsPlaying(false);
      setCurrentTrack(null);
      setPlaybackPosition(0);
      setPlaybackDuration(0);
      localStorage.removeItem("spotify_token");
    }
  }, []);

  // Listen for token from popup
  useEffect(() => {
    function onMessage(e) {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "spotify-token") {
        setSpotifyToken(e.data.token);
      } else if (e.data?.type === "spotify-auth-error") {
        console.error("Spotify auth error:", e.data.error);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (spotifyToken) {
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
        name: "Discogs Music DB",
        getOAuthToken: (cb) => cb(spotifyToken),
        volume: 0.5,
      });

      newPlayer.addListener("ready", ({ device_id }) => {
        console.log("Spotify player ready, device_id:", device_id);
        setDeviceId(device_id);
      });

      newPlayer.addListener("player_state_changed", (state) => {
        if (state) {
          lastPlayedTrackRef.current = state.track_window.current_track;
          setIsPlaying(!state.paused);
          setCurrentTrack(state.track_window.current_track);
          setPlaybackPosition(state.position || 0);
          setPlaybackDuration(state.duration || 0);
        } else {
          const finishedUri = lastPlayedTrackRef.current?.uri ?? null;
          lastPlayedTrackRef.current = null;
          setCurrentTrack(null);
          setPlaybackPosition(0);
          setPlaybackDuration(0);
          if (finishedUri) setTrackJustEndedUri(finishedUri);
        }
      });

      newPlayer.addListener("authentication_error", ({ message }) => {
        console.error("Spotify authentication error:", message);
        handleSpotifyLogout();
      });

      newPlayer.addListener("account_error", ({ message }) => {
        console.error("Spotify account error:", message);
        handleSpotifyLogout();
      });

      newPlayer.addListener("playback_error", ({ message }) => {
        console.error("Spotify playback error:", message);
        // Don't logout on playback errors, just log
      });

      newPlayer.connect();
      setPlayer(newPlayer);
      playerRef.current = newPlayer;
    }
  }, [spotifyToken]);

  // Poll playback position for progress bar when playing
  useEffect(() => {
    if (!playerRef.current || !isPlaying) return;
    const interval = setInterval(async () => {
      const state = await playerRef.current?.getCurrentState();
      if (state) {
        setPlaybackPosition(state.position);
        setPlaybackDuration(state.duration);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack?.uri]);

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

  function seekTrack(positionMs) {
    if (!player || !playbackDuration) return;
    const clamped = Math.max(0, Math.min(Math.round(positionMs), playbackDuration));
    player.seek(clamped);
    setPlaybackPosition(clamped);
  }

  function handleTrackRowClick(e, isActive) {
    if (!isActive || playbackDuration <= 0) return;
    if (e.target.closest("button")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const fraction = Math.max(0, Math.min(1, x / rect.width));
    seekTrack(fraction * playbackDuration);
  }

  function getTrackKey(track) {
    if (!selectedItem || !detailData) return null;
    return `${selectedItem.type}-${selectedItem.id}-${track.title}`;
  }

  function toggleLikeTrack(track) {
    const key = getTrackKey(track);
    if (!key) return;
    setLikedTracks((prev) => {
      const next = { ...prev };
      const current = next[key] ?? 0;
      next[key] = (current + 1) % 3;
      return next;
    });
  }

  useEffect(() => {
    try {
      localStorage.setItem(LIKED_TRACKS_KEY, JSON.stringify(likedTracks));
    } catch {
      /* ignore */
    }
  }, [likedTracks]);

  // Load user's lists when modal opens (both requests in parallel)
  useEffect(() => {
    if (!showListModal || !accessToken) return;
    setListLoading(true);
    setListError(null);
    const t = selectedItem ? (selectedItem.type || "").toLowerCase() : "";
    const needCheck = selectedItem && (t === "release" || t === "master");

    const listsPromise = authFetch(`${API_BASE}/api/search/lists/`).then(async (res) => {
      if (!res.ok) {
        const contentType = res.headers.get("content-type") || "";
        let errorText = `HTTP ${res.status}`;
        if (contentType.includes("application/json")) {
          try {
            const errorData = await res.json();
            errorText = errorData.error || errorData.detail || errorText;
          } catch {
            // ignore
          }
        } else {
          errorText = `Failed to load lists (${res.status})`;
        }
        throw new Error(errorText);
      }
      return res.json();
    });

    const checkPromise = needCheck
      ? authFetch(
          `${API_BASE}/api/search/lists/items/check/?type=${encodeURIComponent(t)}&id=${encodeURIComponent(selectedItem.id)}`
        )
          .then(async (res) => {
            if (!res.ok) return { list_ids: [] };
            return res.json();
          })
          .catch(() => ({ list_ids: [] }))
      : Promise.resolve({ list_ids: [] });

    Promise.all([listsPromise, checkPromise])
      .then(([data, checkData]) => {
        setLists(data.lists || []);
        setSelectedListIds(checkData.list_ids || []);
      })
      .catch((err) => {
        setListError(err.message || "Failed to load lists");
        setLists([]);
      })
      .finally(() => setListLoading(false));
  }, [showListModal, accessToken, selectedItem]);

  // Handle opening list modal
  function handleAddToList() {
    if (!selectedItem) return;
    const t = (selectedItem.type || "").toLowerCase();
    if (t !== "release" && t !== "master") return;
    setShowListModal(true);
    setNewListName("");
    setListError(null);
  }

  // Handle closing modal
  function handleCloseListModal() {
    setShowListModal(false);
    setSelectedListIds([]);
    setNewListName("");
    setListError(null);
  }

  // Toggle list selection
  function toggleListSelection(listId) {
    setSelectedListIds((prev) =>
      prev.includes(listId) ? prev.filter((id) => id !== listId) : [...prev, listId]
    );
  }

  // Create new list
  async function handleCreateList(e) {
    e.preventDefault();
    const name = newListName.trim();
    if (!name) return;
    setListLoading(true);
    setListError(null);
    try {
      const res = await authFetch(`${API_BASE}/api/search/lists/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const contentType = res.headers.get("content-type") || "";
        let errorMessage = `HTTP ${res.status}`;
        if (contentType.includes("application/json")) {
          try {
            const errorData = await res.json();
            errorMessage = errorData.error || errorData.detail || errorMessage;
          } catch {
            // If JSON parsing fails, use default
          }
        } else {
          errorMessage = `Failed to create list (${res.status})`;
        }
        throw new Error(errorMessage);
      }
      const data = await res.json();
      setLists((prev) => [data, ...prev]);
      setSelectedListIds((prev) => [...prev, data.id]);
      setNewListName("");
    } catch (err) {
      setListError(err.message || "Failed to create list");
    } finally {
      setListLoading(false);
    }
  }

  // Add album to selected lists
  async function handleAddToLists() {
    if (!selectedItem || selectedListIds.length === 0) return;
    const t = (selectedItem.type || "").toLowerCase();
    if (t !== "release" && t !== "master") return;

    const titleToSave = (
      detailData?.artists?.length && detailData?.title
        ? `${detailData.artists.map((a) => a.name).join(", ")} - ${detailData.title}`
        : detailData?.title || selectedItem?.title || ""
    ).trim();

    setListLoading(true);
    setListError(null);
    try {
      const res = await authFetch(`${API_BASE}/api/search/lists/items/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: t,
          id: selectedItem.id,
          list_ids: selectedListIds,
          title: titleToSave,
        }),
      });
      if (!res.ok) {
        const contentType = res.headers.get("content-type") || "";
        let errorMessage = `HTTP ${res.status}`;
        if (contentType.includes("application/json")) {
          try {
            const errorData = await res.json();
            errorMessage = errorData.error || errorData.detail || errorMessage;
          } catch {
            // If JSON parsing fails, use default
          }
        } else {
          errorMessage = `Failed to add to lists (${res.status})`;
        }
        throw new Error(errorMessage);
      }
      handleCloseListModal();
    } catch (err) {
      setListError(err.message || "Failed to add to lists");
    } finally {
      setListLoading(false);
    }
  }

  // Reset autoplay trigger when track changes
  useEffect(() => {
    autoplayTriggeredRef.current = false;
  }, [currentTrack?.uri]);

  // Autoplay: when track ends (state=null), play next track in list
  useEffect(() => {
    if (!trackJustEndedUri) return;
    if (!autoplay || !detailData?.tracklist?.length || !spotifyMatches.length || !deviceId || !spotifyToken) {
      setTrackJustEndedUri(null);
      return;
    }

    const match = spotifyMatches.find((m) => m.spotify_track?.uri === trackJustEndedUri);
    setTrackJustEndedUri(null);
    if (!match) return;

    const currentIndex = detailData.tracklist.findIndex((t) => t.title === match.discogs_title);
    if (currentIndex < 0) return;

    const nextIndex = (currentIndex + 1) % detailData.tracklist.length;
    const nextTrack = detailData.tracklist[nextIndex];
    const nextMatch = spotifyMatches.find((m) => m.discogs_title === nextTrack.title);
    if (!nextMatch?.spotify_track?.uri) return;

    playTrack(nextMatch.spotify_track.uri);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- playTrack omitted
  }, [trackJustEndedUri, autoplay, detailData, spotifyMatches, deviceId, spotifyToken]);

  // Autoplay fallback: when position reaches end (in case state=null doesn't fire)
  useEffect(() => {
    if (!autoplay || !detailData?.tracklist?.length || !spotifyMatches.length || !currentTrack?.uri || !deviceId || !spotifyToken) return;
    if (playbackDuration <= 0 || playbackPosition < Math.max(0, playbackDuration - 300)) return;
    if (autoplayTriggeredRef.current) return;

    const match = spotifyMatches.find((m) => m.spotify_track?.uri === currentTrack.uri);
    if (!match) return;
    const currentIndex = detailData.tracklist.findIndex((t) => t.title === match.discogs_title);
    if (currentIndex < 0) return;

    const nextIndex = (currentIndex + 1) % detailData.tracklist.length;
    const nextTrack = detailData.tracklist[nextIndex];
    const nextMatch = spotifyMatches.find((m) => m.discogs_title === nextTrack.title);
    if (!nextMatch?.spotify_track?.uri) return;

    autoplayTriggeredRef.current = true;
    playTrack(nextMatch.spotify_track.uri);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- playTrack omitted
  }, [autoplay, currentTrack?.uri, playbackPosition, playbackDuration, detailData, spotifyMatches, deviceId, spotifyToken]);

  if (!accessToken) {
    return (
      <div className="app">
        <div className="auth-screen">
          <h1>Soultrust MusicDB</h1>
          <p className="auth-subtitle">Sign in to search and manage your music lists.</p>
          <form onSubmit={handleAuthSubmit} className="auth-form">
            <input
              type="email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              placeholder="Email"
              autoComplete="email"
              disabled={authLoading}
            />
            <input
              type="password"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              placeholder="Password"
              autoComplete={authMode === "register" ? "new-password" : "current-password"}
              disabled={authLoading}
            />
            {authError && <p className="error">{authError}</p>}
            <button type="submit" disabled={authLoading}>
              {authLoading ? "Please wait…" : authMode === "register" ? "Register" : "Log in"}
            </button>
          </form>
          <button
            type="button"
            className="auth-toggle"
            onClick={() => {
              setAuthMode((m) => (m === "login" ? "register" : "login"));
              setAuthError(null);
            }}
          >
            {authMode === "login" ? "Create an account" : "Already have an account? Log in"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="app-header">
        <h1>Soultrust MusicDB</h1>
        {spotifyToken && deviceId ? (
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
            Connect to Spotify
          </button>
        )}
        <button onClick={logout} className="app-logout-btn" title="Log out of the app">
          Log out
        </button>
      </div>
      <div className="content">
        <div className="sidebar">
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
          {loading && <p className="detail-loading">Loading…</p>}
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
        </div>
        {selectedItem && (
          <div className="detail">
            {detailLoading && <p className="detail-loading">Loading details…</p>}
            {detailError && <p className="error">{detailError}</p>}
            {detailData && (
              <div className="detail-columns">
                <div className="detail-main">
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
                        {(detailData.uri || selectedItem?.type === "release" || selectedItem?.type === "master") && (
                          <div className="detail-row detail-row-links">
                            {(selectedItem?.type === "release" || selectedItem?.type === "master") && (
                              <button
                                onClick={handleAddToList}
                                className="add-to-list-btn"
                              >
                                Add to List
                              </button>
                            )}
                            {detailData.uri && (
                              <a
                                href={detailData.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="detail-link"
                              >
                                View on Discogs →
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {detailData.tracklist && detailData.tracklist.length > 0 && (
                    <div className="detail-tracklist">
                      <div className="tracklist-header">
                        <h3>
                          Tracklist{" "}
                          {spotifyMatching && (
                            <span className="matching-indicator">(Matching to Spotify…)</span>
                          )}
                        </h3>
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
                      </div>
                      <ol className="tracklist">
                        {detailData.tracklist.map((track, i) => {
                          const match = spotifyMatches.find((m) => m.discogs_title === track.title);
                          const spotifyTrack = match?.spotify_track;
                          const isCurrentTrack = spotifyTrack?.uri && currentTrack?.uri && spotifyTrack.uri === currentTrack.uri;
                          const isTrackFinished = playbackDuration > 0 && playbackPosition >= playbackDuration;
                          const isActive = isCurrentTrack && !isTrackFinished;
                          const progress = playbackDuration > 0 ? (playbackPosition / playbackDuration) * 100 : 0;
                          const likeState = likedTracks[getTrackKey(track)] ?? 0;
                          return (
                            <li
                              key={i}
                              className={isActive ? "track-playing" : ""}
                              onClick={(e) => handleTrackRowClick(e, isActive)}
                              title={isActive ? "Click to seek" : undefined}
                            >
                              <div className="track-progress-bar" style={{ width: isActive ? `${progress}%` : "0" }} />
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
                              <button
                                type="button"
                                className={`track-like-btn track-like-${likeState}`}
                                onClick={() => toggleLikeTrack(track)}
                                title={likeState === 0 ? "Like" : likeState === 1 ? "Especially like" : "Remove like"}
                                aria-label={likeState === 0 ? "Like track" : likeState === 1 ? "Especially like track" : "Remove like"}
                              >
                                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                              </button>
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
                </div>
                {(overviewLoading || overview || overviewError) && (
                  <div className="detail-overview">
                    <h3>Overview</h3>
                    {overviewLoading && <p className="detail-loading">Loading overview…</p>}
                    {overviewError && !overviewLoading && (
                      <p className="error">{overviewError}</p>
                    )}
                    {overview && !overviewLoading && (
                      <p className="overview-text">{overview}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {showListModal && (
        <div className="modal-overlay" onClick={handleCloseListModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add to List</h2>
              <button className="modal-close" onClick={handleCloseListModal}>×</button>
            </div>
            <div className="modal-body">
              {listLoading && lists.length === 0 ? (
                <p className="detail-loading">Loading lists…</p>
              ) : (
                <>
                  {lists.length > 0 && (
                    <div className="lists-checkbox-group">
                      <p className="lists-label">Select lists:</p>
                      {lists.map((list) => (
                        <label key={list.id} className="list-checkbox">
                          <input
                            type="checkbox"
                            checked={selectedListIds.includes(list.id)}
                            onChange={() => toggleListSelection(list.id)}
                            disabled={listLoading}
                          />
                          <span className="list-checkbox-box" />
                          <span className="list-checkbox-label">{list.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  <form onSubmit={handleCreateList} className="create-list-form">
                    <label htmlFor="new-list-name">Create a new list</label>
                    <div className="create-list-input-group">
                      <input
                        id="new-list-name"
                        type="text"
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        placeholder="List name"
                        disabled={listLoading}
                      />
                      <button type="submit" disabled={listLoading || !newListName.trim()}>
                        Create
                      </button>
                    </div>
                  </form>
                  {listError && <p className="error">{listError}</p>}
                  <div className="modal-actions">
                    <button
                      onClick={handleAddToLists}
                      disabled={listLoading || selectedListIds.length === 0}
                      className="add-to-lists-btn"
                    >
                      {listLoading ? "Adding…" : `Add to ${selectedListIds.length} list${selectedListIds.length !== 1 ? "s" : ""}`}
                    </button>
                    <button onClick={handleCloseListModal} className="modal-cancel-btn">
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
