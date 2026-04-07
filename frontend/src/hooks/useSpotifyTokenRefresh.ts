import { useCallback, useEffect, useRef } from "react";
import type { AuthFetchFn } from "../services/especiallyLikedApi";

const REFRESH_MARGIN_MS = 5 * 60 * 1000; // refresh 5 min before expiry

export function useSpotifyTokenRefresh({
  API_BASE,
  authFetch,
  spotifyToken,
  setSpotifyToken,
}: {
  API_BASE: string;
  authFetch: AuthFetchFn;
  spotifyToken: string | null;
  setSpotifyToken: (token: string | null) => void;
}) {
  const expiresAtRef = useRef<number>(0);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountRefreshedRef = useRef(false);

  const storeRefreshToken = useCallback(
    async (refreshToken: string) => {
      try {
        await authFetch(`${API_BASE}/api/spotify/store-refresh-token/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
      } catch {
        // Best-effort; if this fails the user can still re-connect later
      }
    },
    [API_BASE, authFetch],
  );

  const refreshSpotifyToken = useCallback(async (): Promise<string | null> => {
    try {
      const res = await authFetch(`${API_BASE}/api/spotify/refresh/`, {
        method: "POST",
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        access_token?: string;
        expires_in?: number;
      };
      const token = data.access_token ?? null;
      if (token) {
        setSpotifyToken(token);
        const expiresIn = (data.expires_in ?? 3600) * 1000;
        expiresAtRef.current = Date.now() + expiresIn;
      }
      return token;
    } catch {
      return null;
    }
  }, [API_BASE, authFetch, setSpotifyToken]);

  const scheduleRefresh = useCallback(
    (expiresInMs: number) => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      const delay = Math.max(10_000, expiresInMs - REFRESH_MARGIN_MS);
      refreshTimerRef.current = setTimeout(() => {
        void refreshSpotifyToken();
      }, delay);
    },
    [refreshSpotifyToken],
  );

  const handleTokenReceived = useCallback(
    (accessToken: string, refreshToken: string | null, expiresIn: number | null) => {
      setSpotifyToken(accessToken);
      const expiresInMs = (expiresIn ?? 3600) * 1000;
      expiresAtRef.current = Date.now() + expiresInMs;
      scheduleRefresh(expiresInMs);
      if (refreshToken) void storeRefreshToken(refreshToken);
    },
    [setSpotifyToken, scheduleRefresh, storeRefreshToken],
  );

  // Auto-connect on mount: try to refresh using stored server-side token
  useEffect(() => {
    if (mountRefreshedRef.current) return;
    mountRefreshedRef.current = true;
    void refreshSpotifyToken().then((token) => {
      if (token) {
        const expiresInMs = expiresAtRef.current - Date.now();
        if (expiresInMs > REFRESH_MARGIN_MS) scheduleRefresh(expiresInMs);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  const isTokenFresh = useCallback((): boolean => {
    return Boolean(spotifyToken) && Date.now() < expiresAtRef.current - REFRESH_MARGIN_MS;
  }, [spotifyToken]);

  return {
    refreshSpotifyToken,
    handleTokenReceived,
    isTokenFresh,
    expiresAtRef,
  };
}
