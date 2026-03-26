import { useEffect } from "react";

export function useSpotifyAuth({
  API_BASE,
  SPOTIFY_CLIENT_ID,
  SPOTIFY_REDIRECT_URI,
  setSpotifyToken,
  resetPlayerState,
}) {
  function handleSpotifyLogin(e) {
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
            if (isPopup && window.opener) {
              const storedOrigin = sessionStorage.getItem("spotify_auth_origin");
              const openerOrigin = storedOrigin || window.location.origin;
              window.opener.postMessage(
                { type: "spotify-token", token: data.access_token },
                openerOrigin,
              );
              if (openerOrigin !== window.location.origin) {
                window.opener.postMessage(
                  { type: "spotify-token", token: data.access_token },
                  window.location.origin,
                );
              }
              try {
                window.opener.postMessage({ type: "spotify-token", token: data.access_token }, "*");
              } catch {
                // Some browsers don't allow wildcard
              }
              window.close();
            } else {
              setSpotifyToken(data.access_token);
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
        .catch((err) => {
          console.error("Spotify token exchange error:", err);
          if (isPopup && window.opener) {
            const storedOrigin = sessionStorage.getItem("spotify_auth_origin") || window.location.origin;
            window.opener.postMessage({ type: "spotify-auth-error", error: err.message }, storedOrigin);
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

    if (!isPopup) {
      setSpotifyToken(null);
      resetPlayerState();
      localStorage.removeItem("spotify_token");
    }
  }, [API_BASE, SPOTIFY_REDIRECT_URI, resetPlayerState, setSpotifyToken]);

  useEffect(() => {
    function onMessage(e) {
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
        setSpotifyToken(e.data.token);
        sessionStorage.removeItem("spotify_auth_origin");
      } else if (e.data.type === "spotify-auth-error") {
        console.error("Spotify auth error:", e.data.error);
        sessionStorage.removeItem("spotify_auth_origin");
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [setSpotifyToken]);

  return { handleSpotifyLogin };
}
