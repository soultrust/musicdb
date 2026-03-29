/// <reference types="vite/client" />

/** Partial Web Playback SDK state from `getCurrentState` */
export type SpotifyPlayerSdkState = {
  position: number;
  duration: number;
};

/** Spotify Web Playback SDK instance (loaded at runtime) */
export interface SpotifyWebPlayer {
  addListener(event: string, cb: (payload: unknown) => void): void;
  connect(): Promise<boolean>;
  disconnect(): void;
  getCurrentState(): Promise<SpotifyPlayerSdkState | null>;
  togglePlay(): void;
  seek(ms: number): void;
}

declare global {
  interface Window {
    Spotify?: {
      Player: new (options: unknown) => SpotifyWebPlayer;
    };
  }
}

export {};
