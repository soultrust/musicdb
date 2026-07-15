import { useCallback, useEffect, useRef, useState } from "react";
import { spotifyGetDevices, spotifyTransferPlayback } from "../services/spotifyApi";
import type { SpotifyDevice } from "../types/musicDbSlices";

const POLL_INTERVAL_MS = 30000;

export type UseSpotifyDevicesParams = {
  spotifyToken: string | null;
  /** This browser's Web Playback SDK device id, once connected */
  localDeviceId: string | null;
};

/**
 * Tracks the user's Spotify Connect devices (this browser plus any other active
 * clients) and lets them transfer playback between them, mirroring the device
 * switcher in Spotify's own apps.
 */
export function useSpotifyDevices({ spotifyToken, localDeviceId }: UseSpotifyDevicesParams) {
  const [devices, setDevices] = useState<SpotifyDevice[]>([]);
  const tokenRef = useRef(spotifyToken);
  useEffect(() => {
    tokenRef.current = spotifyToken;
  }, [spotifyToken]);

  const refreshDevices = useCallback(() => {
    const token = tokenRef.current;
    if (!token) return;
    void spotifyGetDevices(token)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { devices?: SpotifyDevice[] } | null) => {
        if (data?.devices) setDevices(data.devices);
      })
      .catch(() => {
        // Best-effort: keep the previous device list on transient failures.
      });
  }, []);

  useEffect(() => {
    if (!spotifyToken) {
      setDevices([]);
      return;
    }
    refreshDevices();
    const interval = setInterval(refreshDevices, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [spotifyToken, refreshDevices]);

  // Once this browser's SDK device connects, refresh so it shows up in the list.
  useEffect(() => {
    if (localDeviceId) refreshDevices();
  }, [localDeviceId, refreshDevices]);

  const activeDevice = devices.find((d) => d.is_active);
  const activeSpotifyDeviceId = activeDevice?.id ?? localDeviceId ?? null;

  const switchSpotifyDevice = useCallback(
    (deviceId: string) => {
      const token = tokenRef.current;
      if (!token || !deviceId || deviceId === activeSpotifyDeviceId) return;
      setDevices((prev) => prev.map((d) => ({ ...d, is_active: d.id === deviceId })));
      void spotifyTransferPlayback(deviceId, token, true)
        .catch(() => {
          // Ignored: the next poll reconciles state if the transfer failed.
        })
        .then(() => refreshDevices());
    },
    [activeSpotifyDeviceId, refreshDevices],
  );

  return { devices, activeSpotifyDeviceId, switchSpotifyDevice, refreshDevices };
}
