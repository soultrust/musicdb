import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSyntheticEvent } from "../test/helpers";
import { useSpotifyAuth } from "./useSpotifyAuth";

describe("useSpotifyAuth", () => {
  const API_BASE = "http://localhost:8000";
  const SPOTIFY_REDIRECT_URI = "http://127.0.0.1:3000";

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    sessionStorage.clear();
    localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("handleSpotifyLogin logs error when client id is missing", () => {
    const setSpotifyToken = vi.fn();
    const resetPlayerState = vi.fn();
    const handleTokenReceived = vi.fn();
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

    const { result } = renderHook(() =>
      useSpotifyAuth({
        API_BASE,
        SPOTIFY_CLIENT_ID: "",
        SPOTIFY_REDIRECT_URI,
        setSpotifyToken,
        resetPlayerState,
        handleTokenReceived,
      }),
    );

    act(() => {
      result.current.handleSpotifyLogin(fakeSyntheticEvent());
    });

    expect(openSpy).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it("handleSpotifyLogin opens popup and stores origin", () => {
    const setSpotifyToken = vi.fn();
    const resetPlayerState = vi.fn();
    const handleTokenReceived = vi.fn();
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => ({}) as unknown as Window);

    const { result } = renderHook(() =>
      useSpotifyAuth({
        API_BASE,
        SPOTIFY_CLIENT_ID: "client-id-123",
        SPOTIFY_REDIRECT_URI,
        setSpotifyToken,
        resetPlayerState,
        handleTokenReceived,
      }),
    );

    act(() => {
      result.current.handleSpotifyLogin(fakeSyntheticEvent());
    });

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem("spotify_auth_origin")).toBe(window.location.origin);
  });

  it("on mount without code in non-popup does not clear token", async () => {
    const setSpotifyToken = vi.fn();
    const resetPlayerState = vi.fn();
    const handleTokenReceived = vi.fn();

    renderHook(() =>
      useSpotifyAuth({
        API_BASE,
        SPOTIFY_CLIENT_ID: "client-id-123",
        SPOTIFY_REDIRECT_URI,
        setSpotifyToken,
        resetPlayerState,
        handleTokenReceived,
      }),
    );

    await waitFor(() => {
      expect(setSpotifyToken).not.toHaveBeenCalledWith(null);
      expect(resetPlayerState).not.toHaveBeenCalled();
    });
  });

  it("accepts spotify-token postMessage and calls handleTokenReceived", async () => {
    const setSpotifyToken = vi.fn();
    const resetPlayerState = vi.fn();
    const handleTokenReceived = vi.fn();

    renderHook(() =>
      useSpotifyAuth({
        API_BASE,
        SPOTIFY_CLIENT_ID: "client-id-123",
        SPOTIFY_REDIRECT_URI,
        setSpotifyToken,
        resetPlayerState,
        handleTokenReceived,
      }),
    );

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: window.location.origin,
          data: {
            type: "spotify-token",
            token: "sp-token-xyz",
            refresh_token: "rt-abc",
            expires_in: 3600,
          },
        }),
      );
    });

    await waitFor(() => {
      expect(handleTokenReceived).toHaveBeenCalledWith("sp-token-xyz", "rt-abc", 3600);
    });
  });
});
