function headersObject(headers: RequestInit["headers"]): Record<string, string> {
  if (!headers) return {};
  if (headers instanceof Headers) {
    const out: Record<string, string> = {};
    headers.forEach((value, key) => {
      out[key] = value;
    });
    return out;
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }
  return { ...headers };
}

export type AuthFetchDeps = {
  API_BASE: string;
  AUTH_REFRESH_KEY: string;
  accessToken: string | null;
  setAccessToken: (token: string) => void;
  logout: () => void;
};

export async function authFetchWithRefresh(
  url: string,
  options: RequestInit = {},
  {
    API_BASE,
    AUTH_REFRESH_KEY,
    accessToken,
    setAccessToken,
    logout,
  }: AuthFetchDeps,
): Promise<Response> {
  const headers = { ...headersObject(options.headers) };
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
      const refreshData = (await refreshRes.json()) as { access?: string };
      if (refreshData.access) {
        setAccessToken(refreshData.access);
        const retryHeaders = {
          ...headersObject(options.headers),
          Authorization: `Bearer ${refreshData.access}`,
        };
        res = await fetch(url, { ...options, headers: retryHeaders });
      }
    }

    if (res.status === 401) logout();
  }

  return res;
}
