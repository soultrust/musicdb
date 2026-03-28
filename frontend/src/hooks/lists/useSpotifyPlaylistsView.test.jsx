import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSpotifyPlaylistsView } from "./useSpotifyPlaylistsView";

function makeJsonResponse(body, ok = true) {
  return {
    ok,
    json: async () => body,
  };
}

describe("useSpotifyPlaylistsView", () => {
  const API_BASE = "http://localhost:8000";

  it("resets state when not in spotify-playlists view", async () => {
    const authFetch = vi.fn((url) => {
      if (url.includes("/api/spotify/playlists/")) {
        return Promise.resolve(makeJsonResponse({ playlists: [{ id: "p1", name: "Playlist 1" }] }));
      }
      throw new Error(`Unexpected URL: ${url}`);
    });
    const { result, rerender } = renderHook(
      (props) =>
        useSpotifyPlaylistsView({
          API_BASE,
          accessToken: "jwt",
          spotifyToken: "sp",
          viewListId: props.viewListId,
          authFetch,
        }),
      { initialProps: { viewListId: "spotify-playlists" } },
    );

    act(() => {
      result.current.setSelectedPlaylistId("p1");
      result.current.setPlaylistTracksData({ tracks: [{ id: "x" }] });
    });
    rerender({ viewListId: "list-123" });

    await waitFor(() => {
      expect(result.current.selectedPlaylistId).toBeNull();
      expect(result.current.playlistTracksData).toBeNull();
      expect(result.current.spotifyPlaylists).toEqual([]);
    });
  });

  it("fetches spotify playlists for sentinel view with tokens", async () => {
    const authFetch = vi.fn((url) => {
      if (url.includes("/api/spotify/playlists/")) {
        return Promise.resolve(makeJsonResponse({ playlists: [{ id: "p1", name: "Playlist 1" }] }));
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const { result } = renderHook(() =>
      useSpotifyPlaylistsView({
        API_BASE,
        accessToken: "jwt",
        spotifyToken: "spotify-token",
        viewListId: "spotify-playlists",
        authFetch,
      }),
    );

    await waitFor(() => {
      expect(result.current.spotifyPlaylists).toHaveLength(1);
    });
  });

  it("fetches selected playlist tracks when playlist is chosen", async () => {
    const authFetch = vi.fn((url) => {
      if (url.includes("/api/spotify/playlists/") && !url.includes("/tracks/")) {
        return Promise.resolve(makeJsonResponse({ playlists: [{ id: "p1", name: "Playlist 1" }] }));
      }
      if (url.includes("/api/spotify/playlists/p1/tracks/")) {
        return Promise.resolve(makeJsonResponse({ id: "p1", tracks: [{ id: "t1" }] }));
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const { result } = renderHook(() =>
      useSpotifyPlaylistsView({
        API_BASE,
        accessToken: "jwt",
        spotifyToken: "spotify-token",
        viewListId: "spotify-playlists",
        authFetch,
      }),
    );

    await waitFor(() => {
      expect(result.current.spotifyPlaylists).toHaveLength(1);
    });
    act(() => {
      result.current.setSelectedPlaylistId("p1");
    });

    await waitFor(() => {
      expect(result.current.playlistTracksData?.id).toBe("p1");
      expect(result.current.playlistTracksData?.tracks?.[0]?.id).toBe("t1");
    });
  });
});

