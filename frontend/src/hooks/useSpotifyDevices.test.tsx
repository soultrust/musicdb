import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../services/spotifyApi", () => ({
  spotifyGetDevices: vi.fn(),
  spotifyTransferPlayback: vi.fn(() => Promise.resolve()),
}));

import { spotifyGetDevices, spotifyTransferPlayback } from "../services/spotifyApi";
import { useSpotifyDevices } from "./useSpotifyDevices";

function jsonResponse(body: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response);
}

describe("useSpotifyDevices", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing without a token", () => {
    const { result } = renderHook(() =>
      useSpotifyDevices({ spotifyToken: null, localDeviceId: null }),
    );
    expect(result.current.devices).toEqual([]);
    expect(spotifyGetDevices).not.toHaveBeenCalled();
  });

  it("fetches devices when a token is present and marks the active one", async () => {
    vi.mocked(spotifyGetDevices).mockReturnValue(
      jsonResponse({
        devices: [
          { id: "d1", name: "This Browser", type: "Computer", is_active: true },
          { id: "d2", name: "Kitchen Speaker", type: "Speaker", is_active: false },
        ],
      }),
    );

    const { result } = renderHook(() =>
      useSpotifyDevices({ spotifyToken: "tok", localDeviceId: "d1" }),
    );

    await waitFor(() => expect(result.current.devices).toHaveLength(2));
    expect(result.current.activeSpotifyDeviceId).toBe("d1");
  });

  it("falls back to the local device id when no device is marked active", async () => {
    vi.mocked(spotifyGetDevices).mockReturnValue(jsonResponse({ devices: [] }));

    const { result } = renderHook(() =>
      useSpotifyDevices({ spotifyToken: "tok", localDeviceId: "local-1" }),
    );

    await waitFor(() => expect(spotifyGetDevices).toHaveBeenCalled());
    expect(result.current.activeSpotifyDeviceId).toBe("local-1");
  });

  it("switchSpotifyDevice transfers playback and optimistically updates active device", async () => {
    vi.mocked(spotifyGetDevices).mockReturnValue(
      jsonResponse({
        devices: [
          { id: "d1", name: "This Browser", type: "Computer", is_active: true },
          { id: "d2", name: "Kitchen Speaker", type: "Speaker", is_active: false },
        ],
      }),
    );

    const { result } = renderHook(() =>
      useSpotifyDevices({ spotifyToken: "tok", localDeviceId: "d1" }),
    );
    await waitFor(() => expect(result.current.devices).toHaveLength(2));

    act(() => {
      result.current.switchSpotifyDevice("d2");
    });

    expect(spotifyTransferPlayback).toHaveBeenCalledWith("d2", "tok", true);
    expect(result.current.activeSpotifyDeviceId).toBe("d2");
  });

  it("ignores switching to the already-active device", async () => {
    vi.mocked(spotifyGetDevices).mockReturnValue(
      jsonResponse({
        devices: [{ id: "d1", name: "This Browser", type: "Computer", is_active: true }],
      }),
    );

    const { result } = renderHook(() =>
      useSpotifyDevices({ spotifyToken: "tok", localDeviceId: "d1" }),
    );
    await waitFor(() => expect(result.current.devices).toHaveLength(1));

    act(() => {
      result.current.switchSpotifyDevice("d1");
    });

    expect(spotifyTransferPlayback).not.toHaveBeenCalled();
  });
});
