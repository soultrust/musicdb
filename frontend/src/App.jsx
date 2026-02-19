import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import "./App.css";

// API base URL from environment variable
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
console.log("API_BASE being used:", API_BASE);
const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || "";
// Use current window location to ensure origin matches (localhost vs 127.0.0.1)
const SPOTIFY_REDIRECT_URI = (
  import.meta.env.VITE_SPOTIFY_REDIRECT_URI || window.location.origin
).replace(/\/$/, "");
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
  const [spotifyConnectionStatus, setSpotifyConnectionStatus] = useState("disconnected"); // "disconnected" | "connecting" | "connected"
  const reconnectTimeoutRef = useRef(null);
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
  /** Set of Spotify track IDs that the user has saved in Spotify (for showing as state 1 until overridden). */
  const [spotifySavedTrackIds, setSpotifySavedTrackIds] = useState(() => new Set());
  const [autoplay, setAutoplay] = useState(true);
  /** Tracklist filter: null = all, "liked" = hide unliked, "especially" = hide unliked + liked */
  const [tracklistFilter, setTracklistFilter] = useState(null);
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
  /** Ref to ignore stale "which lists contain this item" responses when modal is reopened for a different item */
  const listModalItemRef = useRef({ id: null, type: null });
  // View-a-list dropdown: all lists for selector, selected list id and its data
  const [allListsForView, setAllListsForView] = useState([]);
  const [viewListId, setViewListId] = useState(null);
  const [listViewData, setListViewData] = useState(null);
  const [listViewLoading, setListViewLoading] = useState(false);
  // Spotify playlists view
  const [spotifyPlaylists, setSpotifyPlaylists] = useState([]);
  const [spotifyPlaylistsLoading, setSpotifyPlaylistsLoading] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [playlistTracksData, setPlaylistTracksData] = useState(null);
  const [playlistTracksLoading, setPlaylistTracksLoading] = useState(false);

  function logout() {
    setAccessToken(null);
    setUser(null);
    setAuthError(null);
    localStorage.removeItem(AUTH_REFRESH_KEY);
    // Also logout from Spotify
    handleSpotifyLogout();
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
          const retryHeaders = {
            ...options.headers,
            Authorization: `Bearer ${refreshData.access}`,
          };
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
      const endpoint =
        authMode === "register" ? `${API_BASE}/api/auth/register/` : `${API_BASE}/api/auth/login/`;
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
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch all lists for the header "View a list" dropdown (no list_type filter)
  useEffect(() => {
    if (!accessToken) {
      setAllListsForView([]);
      return;
    }
    let cancelled = false;
    authFetch(`${API_BASE}/api/search/lists/`)
      .then((res) => (res.ok ? res.json() : { lists: [] }))
      .then((data) => {
        if (!cancelled) setAllListsForView(data.lists || []);
      })
      .catch(() => {
        if (!cancelled) setAllListsForView([]);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  // When user selects a list from dropdown, fetch that list's items
  useEffect(() => {
    if (!viewListId || !accessToken) {
      setListViewData(null);
      return;
    }
    // Skip if it's the special "spotify-playlists" value
    if (viewListId === "spotify-playlists") {
      return;
    }
    setListViewLoading(true);
    setListViewData(null);
    let cancelled = false;
    authFetch(`${API_BASE}/api/search/lists/${viewListId}/`)
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (!cancelled && data) setListViewData(data);
      })
      .finally(() => {
        if (!cancelled) setListViewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewListId, accessToken]);

  // Fetch Spotify playlists when "Shared Playlists" is selected
  useEffect(() => {
    if (viewListId !== "spotify-playlists" || !spotifyToken || !accessToken) {
      setSpotifyPlaylists([]);
      setSelectedPlaylistId(null);
      setPlaylistTracksData(null);
      return;
    }
    setSpotifyPlaylistsLoading(true);
    let cancelled = false;
    authFetch(`${API_BASE}/api/spotify/playlists/`, {
      headers: {
        Authorization: `Bearer ${spotifyToken}`,
      },
    })
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (!cancelled && data) {
          setSpotifyPlaylists(data.playlists || []);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch Spotify playlists:", err);
      })
      .finally(() => {
        if (!cancelled) setSpotifyPlaylistsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewListId, spotifyToken, accessToken]);

  // Fetch playlist tracks when a playlist is selected
  useEffect(() => {
    if (
      !selectedPlaylistId ||
      !spotifyToken ||
      !accessToken ||
      viewListId !== "spotify-playlists"
    ) {
      setPlaylistTracksData(null);
      return;
    }
    setPlaylistTracksLoading(true);
    let cancelled = false;
    authFetch(`${API_BASE}/api/spotify/playlists/${selectedPlaylistId}/tracks/`, {
      headers: {
        Authorization: `Bearer ${spotifyToken}`,
      },
    })
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (!cancelled && data) {
          setPlaylistTracksData(data);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch playlist tracks:", err);
      })
      .finally(() => {
        if (!cancelled) setPlaylistTracksLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPlaylistId, spotifyToken, accessToken, viewListId]);

  // When a list's items load, auto-select the first item and load its detail (same as search results)
  useEffect(() => {
    const items = listViewData?.items;
    if (!viewListId || !items?.length) return;
    const first = items[0];
    handleItemClick({ id: first.id, type: first.type, title: first.title });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when list loads, not when handleItemClick ref changes
  }, [viewListId, listViewData]);

  // Removed consumed list loading - replaced with lists feature

  async function handleSubmit(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const searchRes = await authFetch(
        `${API_BASE}/api/search/?q=${encodeURIComponent(query.trim())}`,
      );
      const data = await searchRes.json();
      if (!searchRes.ok) {
        setError(data.error || `Request failed: ${searchRes.status}`);
        return;
      }
      setResults(data.results || []);
      setViewListId(null); /* switch to search results when searching */
      if (data.results?.length) {
        handleItemClick(data.results[0]);
      } else {
        setSelectedItem(null);
        setDetailData(null);
        setSpotifyMatches([]);
      }
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

      // Fetch album overview (cache or Wikipedia) if we have title and artist
      const album = data.title || "";
      const artist = data.artists?.length ? data.artists.map((a) => a.name).join(", ") : "";
      if (album && artist) {
        setOverviewLoading(true);
        setOverviewError(null);
        try {
          const ovRes = await authFetch(
            `${API_BASE}/api/search/album-overview/?album=${encodeURIComponent(album)}&artist=${encodeURIComponent(artist)}`,
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

  // When we have matches and user's Spotify token, fetch which tracks are in their library (saved)
  useEffect(() => {
    if (!spotifyToken || !spotifyMatches?.length) {
      setSpotifySavedTrackIds(new Set());
      return;
    }
    const ids = spotifyMatches.map((m) => m.spotify_track?.id).filter(Boolean);
    if (ids.length === 0) {
      setSpotifySavedTrackIds(new Set());
      return;
    }
    let cancelled = false;
    const BATCH = 50;
    const saved = new Set();
    (async () => {
      for (let i = 0; i < ids.length; i += BATCH) {
        const chunk = ids.slice(i, i + BATCH);
        try {
          const res = await fetch(
            `https://api.spotify.com/v1/me/tracks/contains?ids=${chunk.map(encodeURIComponent).join(",")}`,
            { headers: { Authorization: `Bearer ${spotifyToken}` } },
          );
          if (!res.ok || cancelled) break;
          const arr = await res.json();
          chunk.forEach((id, idx) => {
            if (arr[idx]) saved.add(id);
          });
        } catch {
          break;
        }
      }
      if (!cancelled) setSpotifySavedTrackIds(new Set(saved));
    })();
    return () => {
      cancelled = true;
    };
  }, [spotifyToken, spotifyMatches]);

  // When window regains focus, refetch Spotify saved state and sync: clear local "liked" (1) to 0 if Spotify says not saved
  useEffect(() => {
    function onFocus() {
      if (!spotifyToken || !spotifyMatches?.length) return;
      const ids = spotifyMatches.map((m) => m.spotify_track?.id).filter(Boolean);
      if (ids.length === 0) return;
      const BATCH = 50;
      const saved = new Set();
      const currentDetail = detailData;
      const currentSelected = selectedItem;
      (async () => {
        for (let i = 0; i < ids.length; i += BATCH) {
          const chunk = ids.slice(i, i + BATCH);
          try {
            const res = await fetch(
              `https://api.spotify.com/v1/me/tracks/contains?ids=${chunk.map(encodeURIComponent).join(",")}`,
              { headers: { Authorization: `Bearer ${spotifyToken}` } },
            );
            if (!res.ok) return;
            const arr = await res.json();
            chunk.forEach((id, idx) => {
              if (arr[idx]) saved.add(id);
            });
          } catch {
            return;
          }
        }
        setSpotifySavedTrackIds(new Set(saved));
        if (currentDetail?.tracklist?.length) {
          setLikedTracks((prev) => {
            let changed = false;
            const next = { ...prev };
            for (const track of currentDetail.tracklist) {
              const key =
                currentSelected && currentDetail
                  ? `${currentSelected.type}-${currentSelected.id}-${track.position != null && track.position !== "" ? String(track.position) : ""}-${track.title}`
                  : null;
              /* Only clear when we have a local liked state (1 or 2); unliking on Spotify → empty star */
              if (!key || (prev[key] !== 1 && prev[key] !== 2)) continue;
              const match = spotifyMatches.find((m) => m.discogs_title === track.title);
              const sid = match?.spotify_track?.id;
              if (sid && !saved.has(sid)) {
                next[key] = 0;
                changed = true;
              }
            }
            return changed ? next : prev;
          });
        }
      })();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [spotifyToken, spotifyMatches, detailData, selectedItem]);

  function handleSpotifyLogin(e) {
    e?.preventDefault?.();

    if (!SPOTIFY_CLIENT_ID) {
      console.error(
        "Spotify Client ID not configured. Please set VITE_SPOTIFY_CLIENT_ID in frontend/.env",
      );
      return;
    }

    // Note: playlist-read-private and playlist-read-collaborative require Extended Quota Mode
    // For now, we'll use basic scopes. Playlist features will work for public playlists only.
    const scopes =
      "streaming user-read-email user-read-private user-library-read user-library-modify";
    const redirectUriEncoded = encodeURIComponent(SPOTIFY_REDIRECT_URI);
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri=${redirectUriEncoded}&scope=${encodeURIComponent(scopes)}`;

    // Store current origin for popup to use
    sessionStorage.setItem("spotify_auth_origin", window.location.origin);

    // Open in popup so the main page stays visible
    const popup = window.open(authUrl, "spotify-auth", "width=500,height=700,scrollbars=yes");
    if (!popup) {
      // Fallback if popup blocked
      window.location.href = authUrl;
    }
  }

  function handleSpotifyLogout() {
    // Clear reconnect timeout if any
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setSpotifyToken(null);
    setPlayer(null);
    setDeviceId(null);
    setIsPlaying(false);
    setCurrentTrack(null);
    setPlaybackPosition(0);
    setPlaybackDuration(0);
    setSpotifyConnectionStatus("disconnected");
    if (playerRef.current) {
      playerRef.current.disconnect();
      playerRef.current = null;
    }
    window.location.hash = "";
  }

  const attemptSpotifyReconnect = useCallback(
    (attemptNumber = 1) => {
      // Don't reconnect if user manually logged out (no token)
      if (!spotifyToken) {
        return;
      }

      const maxAttempts = 5;
      const baseDelay = 2000; // Start with 2 seconds

      if (attemptNumber > maxAttempts) {
        console.error("Spotify: Max reconnection attempts reached");
        setSpotifyConnectionStatus("disconnected");
        return;
      }

      setSpotifyConnectionStatus("connecting");
      const delay = baseDelay * Math.pow(2, attemptNumber - 1); // Exponential backoff: 2s, 4s, 8s, 16s, 32s

      reconnectTimeoutRef.current = setTimeout(() => {
        console.log(
          `Spotify: Attempting to reconnect (attempt ${attemptNumber}/${maxAttempts})...`,
        );
        // Re-initialize player if SDK is available
        if (window.Spotify && spotifyToken && !playerRef.current) {
          // Use the same initializePlayer logic
          const newPlayer = new window.Spotify.Player({
            name: "Discogs Music DB",
            getOAuthToken: (cb) => cb(spotifyToken),
            volume: 0.5,
          });

          newPlayer.addListener("ready", ({ device_id }) => {
            setDeviceId(device_id);
            setSpotifyConnectionStatus("connected");
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
              reconnectTimeoutRef.current = null;
            }
          });

          newPlayer.addListener("not_ready", () => {
            setSpotifyConnectionStatus("disconnected");
            attemptSpotifyReconnect(attemptNumber + 1);
          });

          newPlayer.addListener("authentication_error", ({ message }) => {
            console.error("Spotify authentication error:", message);
            if (playerRef.current) {
              playerRef.current.disconnect();
              playerRef.current = null;
            }
            setPlayer(null);
            setDeviceId(null);
            attemptSpotifyReconnect(attemptNumber + 1);
          });

          newPlayer.addListener("account_error", ({ message }) => {
            console.error("Spotify account error:", message);
            if (playerRef.current) {
              playerRef.current.disconnect();
              playerRef.current = null;
            }
            setPlayer(null);
            setDeviceId(null);
            attemptSpotifyReconnect(attemptNumber + 1);
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

          newPlayer.addListener("playback_error", ({ message }) => {
            console.error("Spotify playback error:", message);
          });

          newPlayer.addListener("initialization_error", ({ message }) => {
            console.error("Spotify initialization error:", message);
            attemptSpotifyReconnect(attemptNumber + 1);
          });

          newPlayer.connect();
          setPlayer(newPlayer);
          playerRef.current = newPlayer;
        } else if (!spotifyToken) {
          // No token, can't reconnect
          setSpotifyConnectionStatus("disconnected");
        }
      }, delay);
    },
    [spotifyToken],
  );

  const initializePlayer = useCallback(() => {
    if (!window.Spotify) {
      console.error("Spotify: Cannot initialize: SDK not loaded");
      return;
    }
    if (playerRef.current) {
      return;
    }

    const newPlayer = new window.Spotify.Player({
      name: "Discogs Music DB",
      getOAuthToken: (cb) => {
        cb(spotifyToken);
      },
      volume: 0.5,
    });

    newPlayer.addListener("ready", ({ device_id }) => {
      setDeviceId(device_id);
      setSpotifyConnectionStatus("connected");
      // Clear any pending reconnect attempts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    });

    newPlayer.addListener("not_ready", ({ device_id }) => {
      console.warn("Spotify: Player not ready, device_id:", device_id);
      setSpotifyConnectionStatus("disconnected");
      // Attempt to reconnect
      attemptSpotifyReconnect(1);
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
      // Clear player but keep token, attempt to reconnect
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
      }
      setPlayer(null);
      setDeviceId(null);
      setSpotifyConnectionStatus("connecting");
      attemptSpotifyReconnect(1);
    });

    newPlayer.addListener("account_error", ({ message }) => {
      console.error("Spotify account error:", message);
      // Clear player but keep token, attempt to reconnect
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
      }
      setPlayer(null);
      setDeviceId(null);
      setSpotifyConnectionStatus("connecting");
      attemptSpotifyReconnect(1);
    });

    newPlayer.addListener("playback_error", ({ message }) => {
      console.error("Spotify playback error:", message);
      // Don't logout on playback errors, just log
    });

    newPlayer.addListener("initialization_error", ({ message }) => {
      console.error("Spotify initialization error:", message);
      setSpotifyConnectionStatus("connecting");
      attemptSpotifyReconnect(1);
    });

    newPlayer.connect();
    setPlayer(newPlayer);
    playerRef.current = newPlayer;
  }, [spotifyToken, attemptSpotifyReconnect]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const error = urlParams.get("error");
    const isPopup = window.opener != null;

    // OAuth callback (popup or redirect)
    if (error) {
      if (isPopup && window.opener) {
        const storedOrigin =
          sessionStorage.getItem("spotify_auth_origin") || window.location.origin;
        window.opener.postMessage({ type: "spotify-auth-error", error }, storedOrigin);
        if (storedOrigin !== window.location.origin) {
          window.opener.postMessage({ type: "spotify-auth-error", error }, window.location.origin);
        }
        sessionStorage.removeItem("spotify_auth_origin");
        window.close();
      } else {
        setSpotifyToken(null);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      return;
    }

    if (code) {
      window.history.replaceState({}, document.title, window.location.pathname);

      fetch(
        `${API_BASE}/api/spotify/callback/?code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(SPOTIFY_REDIRECT_URI)}`,
      )
        .then(async (res) => {
          const contentType = res.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            const text = await res.text();
            throw new Error(
              `Expected JSON but got ${contentType}. Response: ${text.substring(0, 200)}`,
            );
          }
          return res.json();
        })
        .then((data) => {
          if (data.access_token) {
            if (isPopup && window.opener) {
              // Get stored origin or try to detect it
              const storedOrigin = sessionStorage.getItem("spotify_auth_origin");
              const openerOrigin = storedOrigin || window.location.origin;

              // Try the stored/detected origin first
              window.opener.postMessage(
                { type: "spotify-token", token: data.access_token },
                openerOrigin,
              );

              // Also try current origin as fallback (handles localhost vs 127.0.0.1)
              if (openerOrigin !== window.location.origin) {
                window.opener.postMessage(
                  { type: "spotify-token", token: data.access_token },
                  window.location.origin,
                );
              }

              // Try wildcard as last resort (less secure but works across origins)
              try {
                window.opener.postMessage({ type: "spotify-token", token: data.access_token }, "*");
              } catch (e) {
                // Some browsers don't allow wildcard
              }

              window.close();
            } else {
              setSpotifyToken(data.access_token);
            }
          } else {
            console.error("Spotify: No access_token in response:", data);
            if (isPopup && window.opener) {
              const storedOrigin =
                sessionStorage.getItem("spotify_auth_origin") || window.location.origin;
              window.opener.postMessage(
                { type: "spotify-auth-error", error: data.error || "Failed to get token" },
                storedOrigin,
              );
              if (storedOrigin !== window.location.origin) {
                window.opener.postMessage(
                  { type: "spotify-auth-error", error: data.error || "Failed to get token" },
                  window.location.origin,
                );
              }
              sessionStorage.removeItem("spotify_auth_origin");
              window.close();
            }
          }
        })
        .catch((err) => {
          console.error("Spotify token exchange error:", err);
          if (isPopup && window.opener) {
            const storedOrigin =
              sessionStorage.getItem("spotify_auth_origin") || window.location.origin;
            window.opener.postMessage(
              { type: "spotify-auth-error", error: err.message },
              storedOrigin,
            );
            if (storedOrigin !== window.location.origin) {
              window.opener.postMessage(
                { type: "spotify-auth-error", error: err.message },
                window.location.origin,
              );
            }
            sessionStorage.removeItem("spotify_auth_origin");
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
      // Only process messages that look like Spotify auth messages
      if (!e.data || typeof e.data !== "object" || !e.data.type) {
        return; // Ignore non-Spotify messages
      }

      // Only process Spotify auth messages
      if (e.data.type !== "spotify-token" && e.data.type !== "spotify-auth-error") {
        return;
      }

      // Allow messages from same origin or localhost/127.0.0.1 variations
      const isSameOrigin =
        e.origin === window.location.origin ||
        (e.origin.includes("localhost") && window.location.origin.includes("localhost")) ||
        (e.origin.includes("127.0.0.1") && window.location.origin.includes("127.0.0.1")) ||
        (e.origin.includes("localhost") && window.location.origin.includes("127.0.0.1")) ||
        (e.origin.includes("127.0.0.1") && window.location.origin.includes("localhost"));

      // Also allow if it's a local development origin (for security, only allow localhost/127.0.0.1)
      const isLocalDev =
        (e.origin.includes("localhost") || e.origin.includes("127.0.0.1")) &&
        (window.location.origin.includes("localhost") ||
          window.location.origin.includes("127.0.0.1"));

      if (!isSameOrigin && !isLocalDev) {
        return;
      }

      if (e.data.type === "spotify-token") {
        setSpotifyToken(e.data.token);
        setSpotifyConnectionStatus("connecting");
        sessionStorage.removeItem("spotify_auth_origin"); // Clean up
        // Clear any pending reconnect attempts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      } else if (e.data.type === "spotify-auth-error") {
        console.error("Spotify auth error:", e.data.error);
        sessionStorage.removeItem("spotify_auth_origin"); // Clean up
        // Don't auto-reconnect on auth errors (user needs to manually authorize)
        setSpotifyConnectionStatus("disconnected");
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (spotifyToken) {
      setSpotifyConnectionStatus("connecting");
      // Load Spotify Web Playback SDK dynamically
      if (!window.Spotify && !document.getElementById("spotify-player-script")) {
        const script = document.createElement("script");
        script.id = "spotify-player-script";
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.async = true;

        script.onerror = (error) => {
          console.error("Spotify: Failed to load SDK script:", error);
          setSpotifyConnectionStatus("disconnected");
          attemptSpotifyReconnect(1);
        };

        script.onload = () => {
          initializePlayer();
        };

        document.body.appendChild(script);
      } else if (window.Spotify && !playerRef.current) {
        initializePlayer();
      }
    } else {
      setSpotifyConnectionStatus("disconnected");
    }

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [spotifyToken, attemptSpotifyReconnect, initializePlayer]);

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
      const response = await fetch(
        `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
        {
          method: "PUT",
          headers: {
            "Authorization": `Bearer ${spotifyToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ uris: [spotifyUri] }),
        },
      );

      if (!response.ok) {
        const errorData = await response.text();
        console.error("Spotify play API error:", response.status, errorData);
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
    const position = track.position != null && track.position !== "" ? String(track.position) : "";
    return `${selectedItem.type}-${selectedItem.id}-${position}-${track.title}`;
  }

  /** Display state: 0 = not liked, 1 = like (dark green), 2 = especially like (brighter green).
   * Local state (0/1/2) always wins when present. With no local state, show 1 if saved on Spotify else 0. */
  function getDisplayLikeState(track) {
    const key = getTrackKey(track);
    if (!key) return 0;
    const hasLocal = key in likedTracks;
    const local = likedTracks[key];
    const match = spotifyMatches.find((m) => m.discogs_title === track.title);
    const spotifyId = match?.spotify_track?.id;
    const spotifySaved = spotifyId && spotifySavedTrackIds.has(spotifyId);
    if (hasLocal && local === 2) return 2;
    if (hasLocal && local === 1) return 1;
    if (hasLocal && local === 0) return 0;
    return spotifySaved ? 1 : 0;
  }

  function toggleLikeTrack(track) {
    const key = getTrackKey(track);
    if (!key) return;
    const match = spotifyMatches.find((m) => m.discogs_title === track.title);
    const spotifyTrack = match?.spotify_track;
    const displayState = getDisplayLikeState(track);
    const nextState = (displayState + 1) % 3;

    if (nextState === 0 && spotifyTrack?.id && spotifyToken) {
      fetch(`https://api.spotify.com/v1/me/tracks?ids=${encodeURIComponent(spotifyTrack.id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${spotifyToken}` },
      })
        .then(() => {
          setSpotifySavedTrackIds((prev) => {
            const next = new Set(prev);
            next.delete(spotifyTrack.id);
            return next;
          });
        })
        .catch((err) => console.error("Spotify unlike failed:", err));
    }

    if (nextState === 1 && spotifyTrack?.id && spotifyToken) {
      fetch(`https://api.spotify.com/v1/me/tracks?ids=${encodeURIComponent(spotifyTrack.id)}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${spotifyToken}` },
      })
        .then(() => {
          setSpotifySavedTrackIds((prev) => new Set(prev).add(spotifyTrack.id));
        })
        .catch((err) => console.error("Spotify save track failed:", err));
    }

    setLikedTracks((prev) => ({ ...prev, [key]: nextState }));

    // Clearing filter when going to "unliked" keeps the track visible instead of it disappearing
    if (nextState === 0 && tracklistFilter) {
      setTracklistFilter(null);
    }
  }

  /** Visible tracklist for current filter (used for autoplay order and UI). */
  const visibleTracklist = useMemo(() => {
    const list = detailData?.tracklist ?? [];
    if (!tracklistFilter) return list;
    return list.filter((track) => {
      const state = getDisplayLikeState(track);
      if (tracklistFilter === "liked") return state >= 1;
      if (tracklistFilter === "especially") return state === 2;
      return true;
    });
  }, [
    detailData?.tracklist,
    tracklistFilter,
    likedTracks,
    spotifySavedTrackIds,
    spotifyMatches,
    selectedItem,
  ]);

  /** Same visibility rule as visibleTracklist; use in autoplay so we skip hidden tracks correctly per track. */
  function isTrackVisible(track) {
    if (!tracklistFilter) return true;
    const state = getDisplayLikeState(track);
    if (tracklistFilter === "liked") return state >= 1;
    if (tracklistFilter === "especially") return state === 2;
    return true;
  }

  useEffect(() => {
    try {
      localStorage.setItem(LIKED_TRACKS_KEY, JSON.stringify(likedTracks));
    } catch {
      /* ignore */
    }
  }, [likedTracks]);

  // Load user's lists when modal opens. Use cached lists if we have them; only fetch which lists contain this album.
  useEffect(() => {
    if (!showListModal || !accessToken) return;
    setListLoading(true);
    setListError(null);
    const itemId = selectedItem?.id ?? null;
    const itemType = (selectedItem?.type ?? "").toLowerCase() || null;
    listModalItemRef.current = { id: itemId, type: itemType };

    const t = selectedItem ? (selectedItem.type || "").toLowerCase() : "";
    const needCheck = selectedItem && (t === "release" || t === "master");
    const haveListsCached = lists.length > 0;

    const checkPromise = needCheck
      ? authFetch(
          `${API_BASE}/api/search/lists/items/check/?type=${encodeURIComponent(t)}&id=${encodeURIComponent(selectedItem.id)}`,
        )
          .then(async (res) => {
            if (!res.ok) return { list_ids: [] };
            return res.json();
          })
          .catch(() => ({ list_ids: [] }))
      : Promise.resolve({ list_ids: [] });

    const isStillCurrent = () =>
      listModalItemRef.current?.id === itemId && listModalItemRef.current?.type === itemType;

    // This modal is only opened from release/master detail, so we only show and create release (album) lists.
    // Person lists are only created from a person detail page (separate flow).
    const listType = "release";
    if (!haveListsCached) {
      const listsPromise = authFetch(
        `${API_BASE}/api/search/lists/?list_type=${encodeURIComponent(listType)}`,
      ).then(async (res) => {
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
      Promise.all([listsPromise, checkPromise])
        .then(([data, checkData]) => {
          if (!isStillCurrent()) return;
          setLists(data.lists || []);
          setSelectedListIds(checkData.list_ids || []);
        })
        .catch((err) => {
          if (!isStillCurrent()) return;
          setListError(err.message || "Failed to load lists");
          setLists([]);
        })
        .finally(() => {
          if (isStillCurrent()) setListLoading(false);
        });
    } else {
      checkPromise
        .then((checkData) => {
          if (isStillCurrent()) setSelectedListIds(checkData.list_ids || []);
        })
        .catch(() => {
          if (isStillCurrent()) setSelectedListIds([]);
        })
        .finally(() => {
          if (isStillCurrent()) setListLoading(false);
        });
    }
  }, [showListModal, accessToken, selectedItem]);

  // Handle opening list modal
  function handleAddToList() {
    if (!selectedItem) return;
    const t = (selectedItem.type || "").toLowerCase();
    if (t !== "release" && t !== "master") return;
    setShowListModal(true);
    setNewListName("");
    setListError(null);
    setSelectedListIds([]); // Reset until check API returns; avoids showing previous item's selection
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
      prev.includes(listId) ? prev.filter((id) => id !== listId) : [...prev, listId],
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
        body: JSON.stringify({ name, list_type: "release" }),
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
      // Add to header dropdown so the new list appears without refetch
      setAllListsForView((prev) => [
        { id: data.id, list_type: data.list_type, name: data.name },
        ...prev,
      ]);
    } catch (err) {
      setListError(err.message || "Failed to create list");
    } finally {
      setListLoading(false);
    }
  }

  // Add/remove album to/from selected lists
  async function handleAddToLists() {
    if (!selectedItem) return;
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
          list_ids: selectedListIds, // Can be empty to remove from all lists
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
          errorMessage = `Failed to update lists (${res.status})`;
        }
        throw new Error(errorMessage);
      }
      handleCloseListModal();
    } catch (err) {
      setListError(err.message || "Failed to update lists");
    } finally {
      setListLoading(false);
    }
  }

  // Reset autoplay trigger when track changes (with small delay to avoid race with effects)
  useEffect(() => {
    const timer = setTimeout(() => {
      autoplayTriggeredRef.current = false;
    }, 100);
    return () => clearTimeout(timer);
  }, [currentTrack?.uri]);

  // Autoplay: when track ends (state=null), play next *visible* track (skip hidden by filter)
  useEffect(() => {
    if (!trackJustEndedUri) return;
    if (
      !autoplay ||
      !detailData?.tracklist?.length ||
      !spotifyMatches.length ||
      !deviceId ||
      !spotifyToken ||
      visibleTracklist.length === 0
    ) {
      setTrackJustEndedUri(null);
      return;
    }
    if (autoplayTriggeredRef.current) {
      console.log("Autoplay: already triggered, skipping");
      setTrackJustEndedUri(null);
      return;
    }

    const matchIndex = spotifyMatches.findIndex((m) => m.spotify_track?.uri === trackJustEndedUri);
    setTrackJustEndedUri(null);
    if (matchIndex < 0) return;

    const fullList = detailData.tracklist;
    if (matchIndex >= fullList.length || matchIndex >= spotifyMatches.length) {
      console.warn("Autoplay: matchIndex out of bounds", {
        matchIndex,
        fullListLength: fullList.length,
        matchesLength: spotifyMatches.length,
      });
      return;
    }
    const currentIndex =
      matchIndex; /* matches are in tracklist order; use index so duplicate titles don't break */
    const currentTrack = fullList[currentIndex];
    console.log("Autoplay: track ended", {
      currentIndex,
      currentTrackTitle: currentTrack?.title,
      trackJustEndedUri,
      filter: tracklistFilter,
    });

    let foundNext = false;
    for (let j = 1; j <= fullList.length; j++) {
      const nextFullIndex = (currentIndex + j) % fullList.length;
      if (nextFullIndex >= fullList.length || nextFullIndex >= spotifyMatches.length) {
        console.warn("Autoplay: nextFullIndex out of bounds", {
          nextFullIndex,
          fullListLength: fullList.length,
          matchesLength: spotifyMatches.length,
        });
        continue;
      }
      const nextTrack = fullList[nextFullIndex];
      if (!nextTrack) {
        console.warn("Autoplay: nextTrack missing at index", nextFullIndex);
        continue;
      }
      const isVisible = isTrackVisible(nextTrack);
      const nextMatch = spotifyMatches[nextFullIndex]; /* same order as tracklist */
      const hasUri = !!nextMatch?.spotify_track?.uri;
      console.log("Autoplay: checking next", {
        j,
        nextFullIndex,
        nextTrackTitle: nextTrack.title,
        isVisible,
        hasUri,
      });
      if (!isVisible) continue;
      if (hasUri) {
        foundNext = true;
        autoplayTriggeredRef.current = true; /* set BEFORE playTrack to prevent double-trigger */
        console.log("Autoplay: playing next track", {
          nextTrackTitle: nextTrack.title,
          uri: nextMatch.spotify_track.uri,
        });
        playTrack(nextMatch.spotify_track.uri);
        break;
      }
    }
    if (!foundNext) {
      console.warn("Autoplay: no next visible track with Spotify match found");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- playTrack omitted
  }, [
    trackJustEndedUri,
    autoplay,
    detailData,
    spotifyMatches,
    deviceId,
    spotifyToken,
    visibleTracklist,
  ]);

  // Autoplay fallback: when position reaches end (in case state=null doesn't fire); only play next *visible* track
  useEffect(() => {
    if (
      !autoplay ||
      !detailData?.tracklist?.length ||
      !spotifyMatches.length ||
      !currentTrack?.uri ||
      !deviceId ||
      !spotifyToken ||
      visibleTracklist.length === 0
    )
      return;
    if (playbackDuration <= 0 || playbackPosition < Math.max(0, playbackDuration - 300)) return;
    if (autoplayTriggeredRef.current) {
      console.log("Autoplay fallback: already triggered, skipping");
      return;
    }
    if (trackJustEndedUri) {
      console.log("Autoplay fallback: trackJustEndedUri is set, main effect will handle it");
      return;
    }

    const matchIndex = spotifyMatches.findIndex((m) => m.spotify_track?.uri === currentTrack.uri);
    if (matchIndex < 0) return;
    const fullList = detailData.tracklist;
    if (matchIndex >= fullList.length || matchIndex >= spotifyMatches.length) {
      console.warn("Autoplay fallback: matchIndex out of bounds", {
        matchIndex,
        fullListLength: fullList.length,
        matchesLength: spotifyMatches.length,
      });
      return;
    }
    const currentIndex =
      matchIndex; /* matches are in tracklist order; use index so duplicate titles don't break */
    const currentTrackObj = fullList[currentIndex];
    console.log("Autoplay fallback: near end", {
      currentIndex,
      currentTrackTitle: currentTrackObj?.title,
      filter: tracklistFilter,
    });

    let foundNext = false;
    for (let j = 1; j <= fullList.length; j++) {
      const nextFullIndex = (currentIndex + j) % fullList.length;
      if (nextFullIndex >= fullList.length || nextFullIndex >= spotifyMatches.length) {
        console.warn("Autoplay fallback: nextFullIndex out of bounds", {
          nextFullIndex,
          fullListLength: fullList.length,
          matchesLength: spotifyMatches.length,
        });
        continue;
      }
      const nextTrack = fullList[nextFullIndex];
      if (!nextTrack) {
        console.warn("Autoplay fallback: nextTrack missing at index", nextFullIndex);
        continue;
      }
      const isVisible = isTrackVisible(nextTrack);
      const nextMatch = spotifyMatches[nextFullIndex]; /* same order as tracklist */
      const hasUri = !!nextMatch?.spotify_track?.uri;
      console.log("Autoplay fallback: checking next", {
        j,
        nextFullIndex,
        nextTrackTitle: nextTrack.title,
        isVisible,
        hasUri,
      });
      if (!isVisible) continue;
      if (hasUri) {
        foundNext = true;
        autoplayTriggeredRef.current = true; /* set BEFORE playTrack to prevent double-trigger */
        console.log("Autoplay fallback: playing next track", {
          nextTrackTitle: nextTrack.title,
          uri: nextMatch.spotify_track.uri,
        });
        playTrack(nextMatch.spotify_track.uri);
        break;
      }
    }
    if (!foundNext) {
      console.warn("Autoplay fallback: no next visible track with Spotify match found");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- playTrack omitted
  }, [
    autoplay,
    currentTrack?.uri,
    playbackPosition,
    playbackDuration,
    detailData,
    spotifyMatches,
    deviceId,
    spotifyToken,
    visibleTracklist,
  ]);

  if (!accessToken) {
    return (
      <div className="app">
        <div className="auth-screen">
          <h1>MusicDB</h1>
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
        <h1>
          MusicDB <span className="app-header-subtitle">Discogs Interface</span>
        </h1>
        <div className="app-header-right">
          {spotifyToken ? (
            <div className="spotify-controls">
              <span
                className={`spotify-status ${spotifyConnectionStatus === "connected" ? "spotify-connected" : spotifyConnectionStatus === "connecting" ? "spotify-connecting" : "spotify-disconnected"}`}
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
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") {
                setViewListId(null);
                setListViewData(null);
                setSelectedItem(null);
                setDetailData(null);
                setSelectedPlaylistId(null);
                setPlaylistTracksData(null);
              } else if (v === "spotify-playlists") {
                setViewListId("spotify-playlists");
                setListViewData(null);
                setSelectedItem(null);
                setDetailData(null);
                setSelectedPlaylistId(null);
                setPlaylistTracksData(null);
              } else {
                setViewListId(parseInt(v, 10));
                setSelectedItem(null);
                setDetailData(null);
                setSelectedPlaylistId(null);
                setPlaylistTracksData(null);
              }
            }}
            title="Select a list to view"
          >
            <option value="">— Select a list —</option>
            {spotifyToken && <option value="spotify-playlists">Shared Playlists</option>}
            {[
              { label: "Releases", list_type: "release" },
              { label: "Artists", list_type: "person" },
            ].map(({ label, list_type }) => {
              const groupLists = (allListsForView || []).filter((l) => l.list_type === list_type);
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
      <div className="content">
        <div className="sidebar">
          <form onSubmit={handleSubmit} className="search-form">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search releases, artists, labels…"
              disabled={loading}
              autoFocus={viewListId == null}
            />
          </form>
          {error && <p className="error">{error}</p>}
          {viewListId === "spotify-playlists" ? (
            <>
              <div className="list-view-header">
                <span className="list-view-title">Shared Playlists</span>
              </div>
              {spotifyPlaylistsLoading && <p className="detail-loading">Loading playlists…</p>}
              {!spotifyToken && (
                <p className="list-view-empty">Connect to Spotify to view playlists.</p>
              )}
              <ul className="results">
                {spotifyPlaylists.map((playlist) => (
                  <li
                    key={playlist.id}
                    className={selectedPlaylistId === playlist.id ? "selected" : ""}
                    onClick={() => {
                      setSelectedPlaylistId(playlist.id);
                      setSelectedItem(null);
                      setDetailData(null);
                    }}
                  >
                    {playlist.name}
                    {playlist.owner && <span className="playlist-owner"> by {playlist.owner}</span>}
                  </li>
                ))}
              </ul>
              {!spotifyPlaylistsLoading && spotifyToken && spotifyPlaylists.length === 0 && (
                <p className="list-view-empty">No playlists found.</p>
              )}
            </>
          ) : viewListId != null ? (
            <>
              <div className="list-view-header">
                <span className="list-view-title">List: {listViewData?.name ?? "…"}</span>
              </div>
              {listViewLoading && <p className="detail-loading">Loading list…</p>}
              <ul className="results">
                {(listViewData?.items || []).map((item, i) => (
                  <li
                    key={item.id != null ? `${item.type}-${item.id}` : i}
                    className={
                      selectedItem?.id === String(item.id) && selectedItem?.type === item.type
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      handleItemClick({ id: item.id, type: item.type, title: item.title })
                    }
                  >
                    {item.title}
                  </li>
                ))}
              </ul>
              {!listViewLoading &&
                listViewData &&
                (!listViewData.items || listViewData.items.length === 0) && (
                  <p className="list-view-empty">This list is empty.</p>
                )}
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
        {selectedPlaylistId && playlistTracksData ? (
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
        ) : (
          selectedItem && (
            <div className="detail">
              {detailLoading && <p className="detail-loading">Loading details…</p>}
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

                        {(selectedItem?.type === "release" || selectedItem?.type === "master") && (
                          <button onClick={handleAddToList} className="add-to-list-btn">
                            Manage Lists
                          </button>
                        )}
                      </div>
                      <div className="detail-content">
                        <h2 className="detail-title">
                          {(detailData.title || selectedItem.title || "")
                            .toLowerCase()
                            .replace(/\b\w/g, (c) => c.toUpperCase())}
                        </h2>
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
                          <div className="tracklist-header-right">
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
                            <div
                              className={`tracklist-filter${tracklistFilter === null ? " tracklist-filter-all-active" : ""}${tracklistFilter === "liked" ? " tracklist-filter-both-active" : ""}`}
                            >
                              <span className="tracklist-filter-label">Filter by:</span>
                              <button
                                type="button"
                                className={`tracklist-filter-star track-like-btn track-like-0${tracklistFilter === null ? " tracklist-filter-star-active" : ""}`}
                                onClick={() => setTracklistFilter(null)}
                                title="Show all tracks"
                                aria-label="Show all tracks"
                              >
                                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                className={`tracklist-filter-star track-like-btn track-like-1${tracklistFilter === "liked" ? " tracklist-filter-star-active" : ""}`}
                                onClick={() =>
                                  setTracklistFilter((f) => (f === "liked" ? null : "liked"))
                                }
                                title={
                                  tracklistFilter === "liked"
                                    ? "Show all tracks"
                                    : "Hide unliked tracks"
                                }
                                aria-label={
                                  tracklistFilter === "liked" ? "Show all" : "Filter to liked"
                                }
                              >
                                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                className={`tracklist-filter-star track-like-btn track-like-2${tracklistFilter === "especially" ? " tracklist-filter-star-active" : ""}`}
                                onClick={() =>
                                  setTracklistFilter((f) =>
                                    f === "especially" ? null : "especially",
                                  )
                                }
                                title={
                                  tracklistFilter === "especially"
                                    ? "Show all tracks"
                                    : "Hide unliked and liked (show especially liked only)"
                                }
                                aria-label={
                                  tracklistFilter === "especially"
                                    ? "Show all"
                                    : "Filter to especially liked"
                                }
                              >
                                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                        <ol className="tracklist">
                          {detailData.tracklist
                            .filter((track) => {
                              if (!tracklistFilter) return true;
                              const state = getDisplayLikeState(track);
                              if (tracklistFilter === "liked") return state >= 1;
                              if (tracklistFilter === "especially") return state === 2;
                              return true;
                            })
                            .map((track, i) => {
                              const match = spotifyMatches.find(
                                (m) => m.discogs_title === track.title,
                              );
                              const spotifyTrack = match?.spotify_track;
                              const isCurrentTrack =
                                spotifyTrack?.uri &&
                                currentTrack?.uri &&
                                spotifyTrack.uri === currentTrack.uri;
                              const isTrackFinished =
                                playbackDuration > 0 && playbackPosition >= playbackDuration;
                              const isActive = isCurrentTrack && !isTrackFinished;
                              const progress =
                                playbackDuration > 0
                                  ? (playbackPosition / playbackDuration) * 100
                                  : 0;
                              const likeState = getDisplayLikeState(track);
                              const matchedDisconnected = spotifyTrack && !spotifyToken;
                              return (
                                <li
                                  key={getTrackKey(track) || `track-${i}`}
                                  className={[
                                    isActive ? "track-playing" : "",
                                    matchedDisconnected ? "track-matched-disconnected" : "",
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}
                                  onClick={(e) => handleTrackRowClick(e, isActive)}
                                  title={isActive ? "Click to seek" : undefined}
                                >
                                  <div
                                    className="track-progress-bar"
                                    style={{ width: isActive ? `${progress}%` : "0" }}
                                  />
                                  <span className="track-position">
                                    {track.position || `${i + 1}.`}
                                  </span>
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
                                      title={
                                        matchedDisconnected
                                          ? "Connect to Spotify to play"
                                          : `Play ${spotifyTrack.name} by ${spotifyTrack.artists.map((a) => a.name).join(", ")}`
                                      }
                                      disabled={matchedDisconnected}
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!matchedDisconnected) toggleLikeTrack(track);
                                    }}
                                    title={
                                      matchedDisconnected
                                        ? "Connect to Spotify to sync likes"
                                        : likeState === 0
                                          ? "Like"
                                          : likeState === 1
                                            ? "Liked (click for especially like)"
                                            : "Especially like (click to remove)"
                                    }
                                    aria-label={
                                      likeState === 0
                                        ? "Like track"
                                        : likeState === 1
                                          ? "Liked"
                                          : "Especially like"
                                    }
                                    disabled={matchedDisconnected}
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
                      {(detailData.uri ||
                        selectedItem?.type === "release" ||
                        selectedItem?.type === "master") && (
                        <div className="detail-row detail-row-links">
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
                      {overviewLoading && <p className="detail-loading">Loading overview…</p>}
                      {overviewError && !overviewLoading && (
                        <p className="error">
                          {overviewError.includes("Wikipedia") &&
                          overviewError.toLowerCase().includes("no ")
                            ? "No overview available for this album."
                            : overviewError}
                        </p>
                      )}
                      {overview && !overviewLoading && <p className="overview-text">{overview}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        )}
      </div>
      {showListModal && (
        <div className="modal-overlay" onClick={handleCloseListModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Manage Lists</h2>
              <button className="modal-close" onClick={handleCloseListModal}>
                ×
              </button>
            </div>
            <div className="modal-body">
              {listLoading ? (
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
                      disabled={listLoading}
                      className="add-to-lists-btn"
                    >
                      {listLoading
                        ? "Updating…"
                        : selectedListIds.length === 0
                          ? "Remove from all lists"
                          : `Update ${selectedListIds.length} list${selectedListIds.length !== 1 ? "s" : ""}`}
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
