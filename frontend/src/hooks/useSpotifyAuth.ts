import type { SyntheticEvent } from "react";
import { useEffect } from "react";

export function useSpotifyAuth({
  API_BASE,
  SPOTIFY_CLIENT_ID,
  SPOTIFY_REDIRECT_URI,
  setSpotifyToken,
  resetPlayerState,
  handleTokenReceived,
}: {
  API_BASE: string;
  SPOTIFY_CLIENT_ID: string;
  SPOTIFY_REDIRECT_URI: string;
  setSpotifyToken: (token: string | null) => void;
  resetPlayerState: () => void;
  handleTokenReceived: (accessToken: string, refreshToken: string | null, expiresIn: number | null) => void;
}) {
  function handleSpotifyLogin(e?: SyntheticEvent) {
    e?.preventDefault?.();

    if (!SPOTIFY_CLIENT_ID) {
      console.error(
        "Spotify Client ID not configured. Please set VITE_SPOTIFY_CLIENT_ID in frontend/.env",
      );
      return;
    }

    const scopes = "streaming user-read-email user-read-private user-library-read user-library-modify";
    const redirectUriEncoded = encodeURIComponent(SPOTIFY_REDIRECT_URI);
    const authUrl = `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&response_type=code&redirect_uri=${redirectUriEncoded}&scope=${encodeURIComponent(scopes)}`;

    console.log("[DEBUG] Spotify login initiated", {
      redirectUri: SPOTIFY_REDIRECT_URI,
      currentOrigin: window.location.origin,
      apiBase: API_BASE,
    });

    sessionStorage.setItem("spotify_auth_origin", window.location.origin);
    const popup = window.open(authUrl, "spotify-auth", "width=500,height=700,scrollbars=yes");
    if (!popup) window.location.href = authUrl;
  }

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const error = urlParams.get("error");
    const isPopup = window.opener != null;

    if (error) {
      if (isPopup && window.opener) {
        const storedOrigin = sessionStorage.getItem("spotify_auth_origin") || window.location.origin;
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
            const msg = {
              type: "spotify-token",
              token: data.access_token,
              refresh_token: data.refresh_token || null,
              expires_in: data.expires_in || null,
            };
            if (isPopup && window.opener) {
              const storedOrigin = sessionStorage.getItem("spotify_auth_origin");
              const openerOrigin = storedOrigin || window.location.origin;
              window.opener.postMessage(msg, openerOrigin);
              if (openerOrigin !== window.location.origin) {
                window.opener.postMessage(msg, window.location.origin);
              }
              try {
                window.opener.postMessage(msg, "*");
              } catch {
                // Some browsers don't allow wildcard
              }
              window.close();
            } else {
              handleTokenReceived(data.access_token, data.refresh_token || null, data.expires_in || null);
            }
          } else if (isPopup && window.opener) {
            const storedOrigin = sessionStorage.getItem("spotify_auth_origin") || window.location.origin;
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
        })
        .catch((err: unknown) => {
          console.error("Spotify token exchange error:", err);
          const msg = err instanceof Error ? err.message : String(err);
          if (isPopup && window.opener) {
            const storedOrigin = sessionStorage.getItem("spotify_auth_origin") || window.location.origin;
            window.opener.postMessage({ type: "spotify-auth-error", error: msg }, storedOrigin);
            if (storedOrigin !== window.location.origin) {
              window.opener.postMessage(
                { type: "spotify-auth-error", error: msg },
                window.location.origin,
              );
            }
            sessionStorage.removeItem("spotify_auth_origin");
            window.close();
          }
        });
      return;
    }

    // No code, not a popup — nothing to do here.
    // Auto-connect is handled by useSpotifyTokenRefresh.
  }, [API_BASE, SPOTIFY_REDIRECT_URI, handleTokenReceived, resetPlayerState, setSpotifyToken]);

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!e.data || typeof e.data !== "object" || !e.data.type) return;
      if (e.data.type !== "spotify-token" && e.data.type !== "spotify-auth-error") return;

      const isSameOrigin =
        e.origin === window.location.origin ||
        (e.origin.includes("localhost") && window.location.origin.includes("localhost")) ||
        (e.origin.includes("127.0.0.1") && window.location.origin.includes("127.0.0.1")) ||
        (e.origin.includes("localhost") && window.location.origin.includes("127.0.0.1")) ||
        (e.origin.includes("127.0.0.1") && window.location.origin.includes("localhost"));
      const isLocalDev =
        (e.origin.includes("localhost") || e.origin.includes("127.0.0.1")) &&
        (window.location.origin.includes("localhost") || window.location.origin.includes("127.0.0.1"));
      const isRailwayDomainPair =
        (e.origin.includes("railway.app") && window.location.origin.includes("soultrust.com")) ||
        (e.origin.includes("soultrust.com") && window.location.origin.includes("railway.app")) ||
        (e.origin.includes("railway.app") && window.location.origin.includes("railway.app"));

      if (!isSameOrigin && !isLocalDev && !isRailwayDomainPair) return;

      if (e.data.type === "spotify-token") {
        handleTokenReceived(e.data.token, e.data.refresh_token || null, e.data.expires_in || null);
        sessionStorage.removeItem("spotify_auth_origin");
      } else if (e.data.type === "spotify-auth-error") {
        console.error("Spotify auth error:", e.data.error);
        sessionStorage.removeItem("spotify_auth_origin");
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [handleTokenReceived, setSpotifyToken]);

  return { handleSpotifyLogin };
}
