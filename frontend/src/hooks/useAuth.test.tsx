import type { FormEvent } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "./useAuth";

function fakeFormEvent(): FormEvent<HTMLFormElement> {
  return { preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>;
}

describe("useAuth", () => {
  const API_BASE = "http://localhost:8000";
  const AUTH_REFRESH_KEY = "musicdb_refresh";
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("validates empty credentials on submit", async () => {
    const { result } = renderHook(() =>
      useAuth({ API_BASE, AUTH_REFRESH_KEY, onLogoutExtra: vi.fn() }),
    );

    await act(async () => {
      await result.current.handleAuthSubmit(fakeFormEvent());
    });

    expect(result.current.authError).toBe("Email and password are required.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("logs in successfully and stores tokens", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({
        access: "access-token",
        refresh: "refresh-token",
        user: { id: 1, email: "user@example.com" },
      }),
    });

    const { result } = renderHook(() =>
      useAuth({ API_BASE, AUTH_REFRESH_KEY, onLogoutExtra: vi.fn() }),
    );

    act(() => {
      result.current.setAuthEmail("  USER@Example.com ");
      result.current.setAuthPassword("pw123");
    });

    await act(async () => {
      await result.current.handleAuthSubmit(fakeFormEvent());
    });

    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE}/api/auth/login/`,
      expect.objectContaining({ method: "POST" }),
    );
    expect(result.current.accessToken).toBe("access-token");
    expect(localStorage.getItem(AUTH_REFRESH_KEY)).toBe("refresh-token");
    expect(result.current.authError).toBeNull();
  });

  it("logout clears auth state and calls extra hook", () => {
    const onLogoutExtra = vi.fn();
    localStorage.setItem(AUTH_REFRESH_KEY, "refresh-token");
    const { result } = renderHook(() =>
      useAuth({ API_BASE, AUTH_REFRESH_KEY, onLogoutExtra }),
    );

    act(() => {
      result.current.logout();
    });

    expect(result.current.accessToken).toBeNull();
    expect(result.current.authError).toBeNull();
    expect(localStorage.getItem(AUTH_REFRESH_KEY)).toBeNull();
    expect(onLogoutExtra).toHaveBeenCalledTimes(1);
  });

  it("refresh effect restores access token from refresh token", async () => {
    localStorage.setItem(AUTH_REFRESH_KEY, "refresh-token");
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ access: "new-access" }),
    });

    const { result } = renderHook(() =>
      useAuth({ API_BASE, AUTH_REFRESH_KEY, onLogoutExtra: vi.fn() }),
    );

    await waitFor(() => {
      expect(result.current.accessToken).toBe("new-access");
    });
  });

  it("refresh effect removes invalid refresh token on non-ok", async () => {
    localStorage.setItem(AUTH_REFRESH_KEY, "stale-refresh");
    fetchMock.mockResolvedValue({ ok: false });

    renderHook(() => useAuth({ API_BASE, AUTH_REFRESH_KEY, onLogoutExtra: vi.fn() }));

    await waitFor(() => {
      expect(localStorage.getItem(AUTH_REFRESH_KEY)).toBeNull();
    });
  });
});

