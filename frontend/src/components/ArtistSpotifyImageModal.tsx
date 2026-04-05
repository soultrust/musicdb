import { useCallback, useState, type FormEvent } from "react";
import type { AuthFetchFn } from "../services/especiallyLikedApi";
import {
  manualSpotifyArtistImageUrl,
  spotifyArtistImagesUrl,
  spotifyArtistSearchUrl,
} from "../services/searchApi";

type SpotifyArtistHit = {
  id?: string;
  name?: string;
  images?: Array<{ url?: string; width?: number; height?: number }>;
};

type SpotifyImageRow = { url: string; width?: number | null; height?: number | null };

export default function ArtistSpotifyImageModal({
  API_BASE,
  authFetch,
  musicbrainzArtistId,
  artistTitle,
  onClose,
  onSaved,
}: {
  API_BASE: string;
  authFetch: AuthFetchFn;
  musicbrainzArtistId: string;
  artistTitle: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [searchQuery, setSearchQuery] = useState(artistTitle);
  const [searchLoading, setSearchLoading] = useState(false);
  const [artists, setArtists] = useState<SpotifyArtistHit[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [pickedArtist, setPickedArtist] = useState<SpotifyArtistHit | null>(null);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [images, setImages] = useState<SpotifyImageRow[]>([]);
  const [imagesError, setImagesError] = useState<string | null>(null);

  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const runSearch = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      const q = searchQuery.trim();
      if (!q) return;
      setSearchLoading(true);
      setSearchError(null);
      setArtists([]);
      setPickedArtist(null);
      setImages([]);
      try {
        const res = await authFetch(spotifyArtistSearchUrl(API_BASE, q, 12));
        const data = (await res.json()) as { artists?: SpotifyArtistHit[]; error?: string };
        if (!res.ok) {
          setSearchError(data.error || `Search failed (${res.status})`);
          return;
        }
        setArtists(data.artists || []);
      } catch {
        setSearchError("Search failed.");
      } finally {
        setSearchLoading(false);
      }
    },
    [API_BASE, authFetch, searchQuery],
  );

  const pickArtist = useCallback(
    async (artist: SpotifyArtistHit) => {
      const id = artist.id;
      if (!id) return;
      setPickedArtist(artist);
      setImagesLoading(true);
      setImagesError(null);
      setImages([]);
      try {
        const res = await authFetch(spotifyArtistImagesUrl(API_BASE, id));
        const data = (await res.json()) as {
          images?: SpotifyImageRow[];
          error?: string;
        };
        if (!res.ok) {
          setImagesError(data.error || `Could not load images (${res.status})`);
          return;
        }
        const list = (data.images || []).filter((img) => img.url);
        setImages(list);
      } catch {
        setImagesError("Could not load images.");
      } finally {
        setImagesLoading(false);
      }
    },
    [API_BASE, authFetch],
  );

  const saveImage = useCallback(
    async (imageUrl: string) => {
      setSaveLoading(true);
      setSaveError(null);
      try {
        const res = await authFetch(manualSpotifyArtistImageUrl(API_BASE), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            musicbrainz_artist_id: musicbrainzArtistId,
            image_url: imageUrl,
            spotify_artist_id: pickedArtist?.id || "",
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setSaveError(data.error || `Save failed (${res.status})`);
          return;
        }
        await onSaved();
        onClose();
      } catch {
        setSaveError("Save failed.");
      } finally {
        setSaveLoading(false);
      }
    },
    [API_BASE, authFetch, musicbrainzArtistId, onClose, onSaved, pickedArtist?.id],
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content artist-spotify-image-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Artist image (Spotify)</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">
          <p className="artist-spotify-image-intro">
            Search Spotify for <strong>{artistTitle}</strong>, pick the correct artist, then choose an
            image size. This overrides the automatic image for your account only.
          </p>

          <form onSubmit={runSearch} className="artist-spotify-image-search">
            <label htmlFor="artist-spotify-search-q">Search</label>
            <div className="artist-spotify-image-search-row">
              <input
                id="artist-spotify-search-q"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={searchLoading}
                autoFocus
              />
              <button type="submit" disabled={searchLoading || !searchQuery.trim()}>
                {searchLoading ? "Searching…" : "Search"}
              </button>
            </div>
          </form>
          {searchError && <p className="form-error">{searchError}</p>}

          {artists.length > 0 && (
            <div className="artist-spotify-image-section">
              <h3>Artists</h3>
              <ul className="artist-spotify-artist-picks">
                {artists.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      className={
                        pickedArtist?.id === a.id
                          ? "artist-spotify-artist-pick is-active"
                          : "artist-spotify-artist-pick"
                      }
                      onClick={() => void pickArtist(a)}
                    >
                      {a.images?.[0]?.url ? (
                        <img src={a.images[0].url} alt="" className="artist-spotify-artist-thumb" />
                      ) : (
                        <span className="artist-spotify-artist-thumb-placeholder">No img</span>
                      )}
                      <span className="artist-spotify-artist-name">{a.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {pickedArtist && (
            <div className="artist-spotify-image-section">
              <h3>Images for “{pickedArtist.name}”</h3>
              {imagesLoading && <p>Loading images…</p>}
              {imagesError && <p className="form-error">{imagesError}</p>}
              {!imagesLoading && images.length > 0 && (
                <ul className="artist-spotify-image-grid">
                  {images.map((img) => (
                    <li key={img.url}>
                      <button
                        type="button"
                        className="artist-spotify-image-tile"
                        disabled={saveLoading}
                        onClick={() => void saveImage(img.url)}
                      >
                        <img src={img.url} alt="" />
                        <span className="artist-spotify-image-meta">
                          {[img.width, img.height].filter(Boolean).join("×") || "Pick"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {saveError && <p className="form-error">{saveError}</p>}
        </div>
      </div>
    </div>
  );
}
