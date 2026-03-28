/// <reference types="vite/client" />

/** Spotify Web Playback SDK instance (loaded at runtime) */
export interface SpotifyWebPlayer {
  addListener(event: string, cb: (payload?: unknown) => void): void;
  connect(): Promise<boolean>;
  disconnect(): void;
}

declare global {
  interface Window {
    Spotify?: {
      Player: new (options: unknown) => SpotifyWebPlayer;
    };
  }
}

export {};
