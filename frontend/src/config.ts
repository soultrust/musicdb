export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";
export const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || "";
export const SPOTIFY_REDIRECT_URI = (
  import.meta.env.VITE_SPOTIFY_REDIRECT_URI || window.location.origin
).replace(/\/$/, "");
export const AUTH_REFRESH_KEY = "soultrust_refresh_token";
