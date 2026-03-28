import { useEffect, useState } from "react";

export function useAuth({ API_BASE, AUTH_REFRESH_KEY, onLogoutExtra }) {
  const [accessToken, setAccessToken] = useState(null);
  const [_user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  function logout() {
    setAccessToken(null);
    setUser(null);
    setAuthError(null);
    localStorage.removeItem(AUTH_REFRESH_KEY);
    onLogoutExtra?.();
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
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        setAuthError(
          "Server returned HTML instead of JSON. Check that the API is running at " +
            API_BASE +
            " and CORS is configured.",
        );
        return;
      }
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
      try {
        const res = await fetch(`${API_BASE}/api/auth/token/refresh/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh }),
        });
        if (cancelled || !res?.ok) {
          if (res && !res.ok) localStorage.removeItem(AUTH_REFRESH_KEY);
          return;
        }
        const data = await res.json();
        if (data.access) setAccessToken(data.access);
      } catch {
        if (!cancelled) localStorage.removeItem(AUTH_REFRESH_KEY);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [API_BASE, AUTH_REFRESH_KEY]);

  return {
    accessToken,
    setAccessToken,
    authError,
    setAuthError,
    authMode,
    setAuthMode,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    authLoading,
    handleAuthSubmit,
    logout,
  };
}

