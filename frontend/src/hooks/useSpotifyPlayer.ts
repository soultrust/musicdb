import type { MouseEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { spotifyPlayerPlayUris } from "../services/spotifyApi";
import type {
  CatalogTrack,
  DetailData,
  SpotifyMatchRow,
  SpotifyTrackRef,
} from "../types/musicDbSlices";
import type { SpotifyWebPlayer } from "../vite-env";

/** Narrow SDK `player_state_changed` payload enough for this hook */
type SpotifyPlaybackState = {
  paused?: boolean;
  position?: number;
  duration?: number;
  track_window?: { current_track?: SpotifyTrackRef | null; [key: string]: unknown };
};

export type UseSpotifyPlayerParams = {
  spotifyToken: string | null;
  detailData: DetailData | null;
  spotifyMatches: SpotifyMatchRow[];
  visibleTracklist: CatalogTrack[];
  isTrackVisible: (track: CatalogTrack) => boolean;
  tracklistFilter: string | null;
};

export function useSpotifyPlayer({
  spotifyToken,
  detailData,
  spotifyMatches,
  visibleTracklist,
  isTrackVisible,
  tracklistFilter,
}: UseSpotifyPlayerParams) {
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playerRef = useRef<SpotifyWebPlayer | null>(null);
  const attemptSpotifyReconnectRef = useRef<((n: number) => void) | null>(null);
  const autoplayTriggeredRef = useRef(false);
  const lastPlayedTrackRef = useRef<SpotifyTrackRef | null>(null);

  const [spotifyConnectionStatus, setSpotifyConnectionStatus] = useState("disconnected");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrackRef | null>(null);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [autoplay, setAutoplay] = useState(true);
  const [trackJustEndedUri, setTrackJustEndedUri] = useState<string | null>(null);

  const resetPlayerState = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (playerRef.current) {
      playerRef.current.disconnect();
      playerRef.current = null;
    }
    autoplayTriggeredRef.current = false;
    lastPlayedTrackRef.current = null;
    setDeviceId(null);
    setIsPlaying(false);
    setCurrentTrack(null);
    setPlaybackPosition(0);
    setPlaybackDuration(0);
    setTrackJustEndedUri(null);
    setSpotifyConnectionStatus("disconnected");
  }, []);

  const attemptSpotifyReconnect = useCallback(
    (attemptNumber = 1) => {
      if (!spotifyToken) return;
      const maxAttempts = 5;
      const baseDelay = 2000;
      if (attemptNumber > maxAttempts) {
        console.error("Spotify: Max reconnection attempts reached");
        setSpotifyConnectionStatus("disconnected");
        return;
      }

      setSpotifyConnectionStatus("connecting");
      const delay = baseDelay * Math.pow(2, attemptNumber - 1);
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!window.Spotify || !spotifyToken || playerRef.current) {
          if (!spotifyToken) setSpotifyConnectionStatus("disconnected");
          return;
        }

        const newPlayer = new window.Spotify.Player({
          name: "Discogs Music DB",
          getOAuthToken: (cb: (token: string) => void) => cb(spotifyToken),
          volume: 0.5,
        });

        newPlayer.addListener("ready", (p: unknown) => {
          const { device_id } = p as { device_id: string };
          setDeviceId(device_id);
          setSpotifyConnectionStatus("connected");
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
        });

        newPlayer.addListener("not_ready", () => {
          setSpotifyConnectionStatus("disconnected");
          attemptSpotifyReconnectRef.current?.(attemptNumber + 1);
        });

        newPlayer.addListener("authentication_error", (p: unknown) => {
          const { message } = p as { message: string };
          console.error("Spotify authentication error:", message);
          if (playerRef.current) {
            playerRef.current.disconnect();
            playerRef.current = null;
          }
          setDeviceId(null);
          attemptSpotifyReconnectRef.current?.(attemptNumber + 1);
        });

        newPlayer.addListener("account_error", (p: unknown) => {
          const { message } = p as { message: string };
          console.error("Spotify account error:", message);
          if (playerRef.current) {
            playerRef.current.disconnect();
            playerRef.current = null;
          }
          setDeviceId(null);
          attemptSpotifyReconnectRef.current?.(attemptNumber + 1);
        });

        newPlayer.addListener("player_state_changed", (raw) => {
          const state = raw as SpotifyPlaybackState | null;
          if (state) {
            lastPlayedTrackRef.current = state.track_window?.current_track ?? null;
            setIsPlaying(!state.paused);
            setCurrentTrack(state.track_window?.current_track ?? null);
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

        newPlayer.addListener("playback_error", (p: unknown) => {
          const { message } = p as { message: string };
          console.error("Spotify playback error:", message);
        });

        newPlayer.addListener("initialization_error", (p: unknown) => {
          const { message } = p as { message: string };
          console.error("Spotify initialization error:", message);
          attemptSpotifyReconnectRef.current?.(attemptNumber + 1);
        });

        newPlayer.connect();
        playerRef.current = newPlayer;
      }, delay);
    },
    [spotifyToken],
  );

  const initializePlayer = useCallback(() => {
    if (!window.Spotify || playerRef.current) return;
    const newPlayer = new window.Spotify.Player({
      name: "Discogs Music DB",
      getOAuthToken: (cb: (token: string) => void) => cb(spotifyToken ?? ""),
      volume: 0.5,
    });

    newPlayer.addListener("ready", (p: unknown) => {
      const { device_id } = p as { device_id: string };
      setDeviceId(device_id);
      setSpotifyConnectionStatus("connected");
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    });

    newPlayer.addListener("not_ready", () => {
      setSpotifyConnectionStatus("disconnected");
      attemptSpotifyReconnect(1);
    });

    newPlayer.addListener("player_state_changed", (raw) => {
      const state = raw as SpotifyPlaybackState | null;
      if (state) {
        lastPlayedTrackRef.current = state.track_window?.current_track ?? null;
        setIsPlaying(!state.paused);
        setCurrentTrack(state.track_window?.current_track ?? null);
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

    newPlayer.addListener("authentication_error", (p: unknown) => {
      const { message } = p as { message: string };
      console.error("Spotify authentication error:", message);
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
      }
      setDeviceId(null);
      setSpotifyConnectionStatus("connecting");
      attemptSpotifyReconnect(1);
    });

    newPlayer.addListener("account_error", (p: unknown) => {
      const { message } = p as { message: string };
      console.error("Spotify account error:", message);
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
      }
      setDeviceId(null);
      setSpotifyConnectionStatus("connecting");
      attemptSpotifyReconnect(1);
    });

    newPlayer.addListener("playback_error", (p: unknown) => {
      const { message } = p as { message: string };
      console.error("Spotify playback error:", message);
    });

    newPlayer.addListener("initialization_error", (p: unknown) => {
      const { message } = p as { message: string };
      console.error("Spotify initialization error:", message);
      setSpotifyConnectionStatus("connecting");
      attemptSpotifyReconnect(1);
    });

    newPlayer.connect();
    playerRef.current = newPlayer;
  }, [attemptSpotifyReconnect, spotifyToken]);

  useEffect(() => {
    attemptSpotifyReconnectRef.current = attemptSpotifyReconnect;
  }, [attemptSpotifyReconnect]);

  useEffect(() => {
    if (spotifyToken) {
      if (!window.Spotify && !document.getElementById("spotify-player-script")) {
        const script = document.createElement("script");
        script.id = "spotify-player-script";
        script.src = "https://sdk.scdn.co/spotify-player.js";
        script.async = true;
        script.onerror = () => {
          setSpotifyConnectionStatus("disconnected");
          attemptSpotifyReconnect(1);
        };
        script.onload = () => initializePlayer();
        document.body.appendChild(script);
      } else if (window.Spotify && !playerRef.current) {
        initializePlayer();
      }
    } else {
      setTimeout(() => resetPlayerState(), 0);
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [attemptSpotifyReconnect, initializePlayer, resetPlayerState, spotifyToken]);

  useEffect(() => {
    if (!playerRef.current || !isPlaying) return;
    const interval = setInterval(async () => {
      const state = await playerRef.current?.getCurrentState();
      if (!state) return;
      setPlaybackPosition(state.position);
      setPlaybackDuration(state.duration);
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying, currentTrack?.uri]);

  const playTrack = useCallback(
    async (spotifyUri: string) => {
      if (!playerRef.current || !spotifyToken) return;
      if (!deviceId) return;
      try {
        await spotifyPlayerPlayUris(deviceId, [spotifyUri], spotifyToken);
      } catch (err) {
        console.error("Failed to play track:", err);
      }
    },
    [deviceId, spotifyToken],
  );

  const togglePlayback = useCallback(() => {
    playerRef.current?.togglePlay();
  }, []);

  const seekTrack = useCallback(
    (positionMs: number) => {
      if (!playerRef.current || !playbackDuration) return;
      const clamped = Math.max(0, Math.min(Math.round(positionMs), playbackDuration));
      playerRef.current.seek(clamped);
      setPlaybackPosition(clamped);
    },
    [playbackDuration],
  );

  const handleTrackRowClick = useCallback(
    (e: MouseEvent<Element>, isActive: boolean) => {
      if (!isActive || playbackDuration <= 0) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("button")) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const fraction = Math.max(0, Math.min(1, x / rect.width));
      seekTrack(fraction * playbackDuration);
    },
    [playbackDuration, seekTrack],
  );

  const clearTrackJustEndedUri = useCallback(() => {
    setTimeout(() => setTrackJustEndedUri(null), 0);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      autoplayTriggeredRef.current = false;
    }, 100);
    return () => clearTimeout(timer);
  }, [currentTrack?.uri]);

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
      clearTrackJustEndedUri();
      return;
    }
    if (autoplayTriggeredRef.current) {
      clearTrackJustEndedUri();
      return;
    }

    const matchIndex = spotifyMatches.findIndex((m) => m.spotify_track?.uri === trackJustEndedUri);
    clearTrackJustEndedUri();
    if (matchIndex < 0) return;

    const fullList = detailData.tracklist;
    if (!fullList?.length) return;
    let foundNext = false;
    for (let j = 1; j <= fullList.length; j++) {
      const nextFullIndex = (matchIndex + j) % fullList.length;
      if (nextFullIndex >= spotifyMatches.length) continue;
      const nextTrack = fullList[nextFullIndex];
      if (!nextTrack || !isTrackVisible(nextTrack)) continue;
      const nextMatch = spotifyMatches[nextFullIndex];
      const uri = nextMatch?.spotify_track?.uri;
      if (uri) {
        foundNext = true;
        autoplayTriggeredRef.current = true;
        playTrack(uri);
        break;
      }
    }
    if (!foundNext) {
      console.warn("Autoplay: no next visible track with Spotify match found");
    }
  }, [
    autoplay,
    detailData,
    deviceId,
    isTrackVisible,
    playTrack,
    spotifyMatches,
    spotifyToken,
    trackJustEndedUri,
    visibleTracklist,
    clearTrackJustEndedUri,
  ]);

  useEffect(() => {
    if (
      !autoplay ||
      !detailData?.tracklist?.length ||
      !spotifyMatches.length ||
      !currentTrack?.uri ||
      !deviceId ||
      !spotifyToken ||
      visibleTracklist.length === 0
    ) {
      return;
    }
    if (playbackDuration <= 0 || playbackPosition < Math.max(0, playbackDuration - 300)) return;
    if (autoplayTriggeredRef.current || trackJustEndedUri) return;

    const matchIndex = spotifyMatches.findIndex((m) => m.spotify_track?.uri === currentTrack.uri);
    if (matchIndex < 0) return;
    const fullList = detailData.tracklist;
    if (!fullList?.length) return;
    let foundNext = false;
    for (let j = 1; j <= fullList.length; j++) {
      const nextFullIndex = (matchIndex + j) % fullList.length;
      if (nextFullIndex >= spotifyMatches.length) continue;
      const nextTrack = fullList[nextFullIndex];
      if (!nextTrack || !isTrackVisible(nextTrack)) continue;
      const nextMatch = spotifyMatches[nextFullIndex];
      const uri = nextMatch?.spotify_track?.uri;
      if (uri) {
        foundNext = true;
        autoplayTriggeredRef.current = true;
        playTrack(uri);
        break;
      }
    }
    if (!foundNext) {
      console.warn("Autoplay fallback: no next visible track with Spotify match found");
    }
  }, [
    autoplay,
    currentTrack?.uri,
    detailData,
    deviceId,
    isTrackVisible,
    playbackDuration,
    playbackPosition,
    playTrack,
    spotifyMatches,
    spotifyToken,
    trackJustEndedUri,
    visibleTracklist,
    tracklistFilter,
  ]);

  return {
    spotifyConnectionStatus,
    deviceId,
    isPlaying,
    currentTrack,
    playbackPosition,
    playbackDuration,
    autoplay,
    setAutoplay,
    playTrack,
    togglePlayback,
    handleTrackRowClick,
    resetPlayerState,
  };
}
