export async function authFetchWithRefresh(
  url,
  options = {},
  {
    API_BASE,
    AUTH_REFRESH_KEY,
    accessToken,
    setAccessToken,
    logout,
  },
) {
  const headers = { ...(options.headers || {}) };
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
          ...(options.headers || {}),
          Authorization: `Bearer ${refreshData.access}`,
        };
        res = await fetch(url, { ...options, headers: retryHeaders });
      }
    }

    if (res.status === 401) logout();
  }

  return res;
}

