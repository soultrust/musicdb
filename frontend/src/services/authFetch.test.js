import { describe, expect, it, vi } from "vitest";
import { authFetchWithRefresh } from "./authFetch";

describe("authFetchWithRefresh", () => {
  const API_BASE = "http://localhost:8000";
  const AUTH_REFRESH_KEY = "musicdb_refresh";

  it("returns first response when not unauthorized", async () => {
    const res200 = { status: 200 };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(res200));

    const res = await authFetchWithRefresh(
      `${API_BASE}/api/search/`,
      {},
      {
        API_BASE,
        AUTH_REFRESH_KEY,
        accessToken: "access",
        setAccessToken: vi.fn(),
        logout: vi.fn(),
      },
    );

    expect(res).toBe(res200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("refreshes token and retries on 401", async () => {
    localStorage.setItem(AUTH_REFRESH_KEY, "refresh-token");
    const first401 = { status: 401 };
    const refreshRes = { json: async () => ({ access: "new-access" }) };
    const retry200 = { status: 200 };
    const setAccessToken = vi.fn();
    const logout = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(first401)
        .mockResolvedValueOnce(refreshRes)
        .mockResolvedValueOnce(retry200),
    );

    const res = await authFetchWithRefresh(
      `${API_BASE}/api/search/`,
      { method: "GET" },
      {
        API_BASE,
        AUTH_REFRESH_KEY,
        accessToken: "old-access",
        setAccessToken,
        logout,
      },
    );

    expect(setAccessToken).toHaveBeenCalledWith("new-access");
    expect(logout).not.toHaveBeenCalled();
    expect(res).toBe(retry200);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("logs out when still unauthorized after refresh attempt", async () => {
    localStorage.setItem(AUTH_REFRESH_KEY, "refresh-token");
    const first401 = { status: 401 };
    const refreshNoAccess = { json: async () => ({}) };
    const logout = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(first401).mockResolvedValueOnce(refreshNoAccess),
    );

    const res = await authFetchWithRefresh(
      `${API_BASE}/api/search/`,
      {},
      {
        API_BASE,
        AUTH_REFRESH_KEY,
        accessToken: "old-access",
        setAccessToken: vi.fn(),
        logout,
      },
    );

    expect(res.status).toBe(401);
    expect(logout).toHaveBeenCalledTimes(1);
  });
});

