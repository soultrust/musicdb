import type { MouseEvent } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/spotifyApi", () => ({
  spotifyPlayerPlayUris: vi.fn(() => Promise.resolve()),
}));

import { spotifyPlayerPlayUris } from "../services/spotifyApi";
import { useSpotifyPlayer } from "./useSpotifyPlayer";

class FakePlayer {
  listeners: Record<string, (payload?: unknown) => void>;
  disconnect: ReturnType<typeof vi.fn>;
  togglePlay: ReturnType<typeof vi.fn>;
  seek: ReturnType<typeof vi.fn>;
  getCurrentState: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;

  constructor() {
    this.listeners = {};
    this.disconnect = vi.fn();
    this.togglePlay = vi.fn();
    this.seek = vi.fn();
    this.getCurrentState = vi.fn(async () => null);
    this.connect = vi.fn(() => Promise.resolve(true));
  }

  addListener(name: string, cb: (payload?: unknown) => void) {
    this.listeners[name] = cb;
  }

  trigger(name: string, payload?: unknown) {
    this.listeners[name]?.(payload);
  }
}

describe("useSpotifyPlayer", () => {
  let player: FakePlayer;

  beforeEach(() => {
    player = new FakePlayer();
    function PlayerCtor() {
      return player;
    }
    vi.stubGlobal("Spotify", {
      Player: PlayerCtor,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  function renderPlayerHook() {
    return renderHook(() =>
      useSpotifyPlayer({
        spotifyToken: "spotify-token",
        detailData: { tracklist: [{ title: "A" }] },
        spotifyMatches: [{ spotify_track: { uri: "spotify:track:a" } }],
        visibleTracklist: [{ title: "A" }],
        isTrackVisible: () => true,
        tracklistFilter: null,
      }),
    );
  }

  it("connects to spotify player and sets device on ready", async () => {
    const { result } = renderPlayerHook();

    act(() => {
      player.trigger("ready", { device_id: "device-1" });
    });

    await waitFor(() => {
      expect(result.current.spotifyConnectionStatus).toBe("connected");
      expect(result.current.deviceId).toBe("device-1");
    });
  });

  it("playTrack calls spotifyPlayerPlayUris when device is ready", async () => {
    const { result } = renderPlayerHook();

    act(() => {
      player.trigger("ready", { device_id: "device-1" });
    });
    await waitFor(() => expect(result.current.deviceId).toBe("device-1"));

    await act(async () => {
      await result.current.playTrack("spotify:track:abc");
    });

    expect(spotifyPlayerPlayUris).toHaveBeenCalledWith(
      "device-1",
      ["spotify:track:abc"],
      "spotify-token",
    );
  });

  it("togglePlayback proxies to player.togglePlay()", () => {
    const { result } = renderPlayerHook();
    act(() => {
      result.current.togglePlayback();
    });
    expect(player.togglePlay).toHaveBeenCalledTimes(1);
  });

  it("handleTrackRowClick seeks based on click fraction when active", async () => {
    const { result } = renderPlayerHook();

    act(() => {
      player.trigger("player_state_changed", {
        paused: false,
        position: 20000,
        duration: 100000,
        track_window: { current_track: { uri: "spotify:track:abc" } },
      });
    });
    await waitFor(() => expect(result.current.playbackDuration).toBe(100000));

    const event = {
      target: { closest: () => null },
      currentTarget: {
        getBoundingClientRect: () => ({ left: 0, width: 200 } as DOMRect),
      },
      clientX: 100,
    } as unknown as MouseEvent<Element>;
    act(() => {
      result.current.handleTrackRowClick(event, true);
    });

    expect(player.seek).toHaveBeenCalledWith(50000);
  });
});

