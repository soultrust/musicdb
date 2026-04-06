import { useCallback, useState, type FormEvent } from "react";
import type { AuthFetchFn } from "../services/especiallyLikedApi";
import {
  discogsArtistImagesUrl,
  discogsArtistSearchUrl,
  manualSpotifyArtistImageUrl,
  spotifyArtistImagesUrl,
  spotifyArtistSearchUrl,
} from "../services/searchApi";

export type ImageSource = "spotify" | "discogs";

type ImageRow = { url: string; width?: number | null; height?: number | null };

type ArtistRow = {
  id: string;
  name: string;
  thumbUrl?: string | null;
};

type ArtistRowWithThumb = ArtistRow & { thumbUrl: string };

export default function ArtistManualImageModal({
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
  const [source, setSource] = useState<ImageSource>("spotify");
  const [searchQuery, setSearchQuery] = useState(artistTitle);
  const [searchLoading, setSearchLoading] = useState(false);
  const [artists, setArtists] = useState<ArtistRowWithThumb[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [pickedArtist, setPickedArtist] = useState<ArtistRow | null>(null);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [images, setImages] = useState<ImageRow[]>([]);
  const [imagesError, setImagesError] = useState<string | null>(null);

  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const resetAfterSourceChange = useCallback((next: ImageSource) => {
    setSource(next);
    setArtists([]);
    setPickedArtist(null);
    setImages([]);
    setSearchError(null);
    setImagesError(null);
    setSaveError(null);
  }, []);

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
        if (source === "spotify") {
          const res = await authFetch(spotifyArtistSearchUrl(API_BASE, q, 50));
          const data = (await res.json()) as {
            artists?: Array<{ id?: string; name?: string; images?: Array<{ url?: string }> }>;
            error?: string;
            detail?: string;
          };
          if (!res.ok) {
            const hint = data.detail ? `${data.error ?? "Error"}: ${data.detail}` : data.error;
            setSearchError(hint || `Search failed (${res.status})`);
            return;
          }
          const rows: ArtistRowWithThumb[] = (data.artists || [])
            .map((a) => ({
              id: String(a.id ?? ""),
              name: a.name || "",
              thumbUrl: a.images?.find((im) => im?.url)?.url ?? null,
            }))
            .filter((r): r is ArtistRowWithThumb => Boolean(r.id && r.thumbUrl));
          setArtists(rows);
        } else {
          const res = await authFetch(discogsArtistSearchUrl(API_BASE, q, 100));
          const data = (await res.json()) as {
            artists?: Array<{ id?: number | string; name?: string; thumb?: string }>;
            error?: string;
            detail?: string;
          };
          if (!res.ok) {
            const hint = data.detail ? `${data.error ?? "Error"}: ${data.detail}` : data.error;
            setSearchError(hint || `Search failed (${res.status})`);
            return;
          }
          const rows: ArtistRowWithThumb[] = (data.artists || [])
            .map((a) => ({
              id: String(a.id ?? ""),
              name: a.name || "",
              thumbUrl: a.thumb || null,
            }))
            .filter((r): r is ArtistRowWithThumb => Boolean(r.id && r.thumbUrl));
          setArtists(rows);
        }
      } catch {
        setSearchError("Search failed.");
      } finally {
        setSearchLoading(false);
      }
    },
    [API_BASE, authFetch, searchQuery, source],
  );

  const pickArtist = useCallback(
    async (artist: ArtistRow) => {
      const id = artist.id;
      if (!id) return;
      setPickedArtist(artist);
      setImagesLoading(true);
      setImagesError(null);
      setImages([]);
      try {
        const res =
          source === "spotify"
            ? await authFetch(spotifyArtistImagesUrl(API_BASE, id))
            : await authFetch(discogsArtistImagesUrl(API_BASE, id));
        const data = (await res.json()) as {
          images?: ImageRow[];
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
    [API_BASE, authFetch, source],
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
            spotify_artist_id: source === "spotify" && pickedArtist?.id ? pickedArtist.id : "",
            discogs_artist_id: source === "discogs" && pickedArtist?.id ? pickedArtist.id : "",
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
    [API_BASE, authFetch, musicbrainzArtistId, onClose, onSaved, pickedArtist?.id, source],
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content artist-manual-image-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Choose artist image</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">
          <p className="artist-manual-image-intro">
            Search <strong>{artistTitle}</strong> on Spotify or Discogs, pick the artist, then choose
            an image. This overrides the automatic image for your account only.
          </p>

          <div className="artist-image-source-tabs" role="tablist" aria-label="Image source">
            <button
              type="button"
              role="tab"
              aria-selected={source === "spotify"}
              className={source === "spotify" ? "is-active" : ""}
              onClick={() => resetAfterSourceChange("spotify")}
            >
              Spotify
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={source === "discogs"}
              className={source === "discogs" ? "is-active" : ""}
              onClick={() => resetAfterSourceChange("discogs")}
            >
              Discogs
            </button>
          </div>

          <form onSubmit={runSearch} className="artist-spotify-image-search">
            <label htmlFor="artist-manual-search-q">Search</label>
            <div className="artist-spotify-image-search-row">
              <input
                id="artist-manual-search-q"
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
                  <li key={`${source}-${a.id}`}>
                    <button
                      type="button"
                      className={
                        pickedArtist?.id === a.id
                          ? "artist-spotify-artist-pick is-active"
                          : "artist-spotify-artist-pick"
                      }
                      onClick={() => void pickArtist(a)}
                    >
                      <img src={a.thumbUrl} alt="" className="artist-spotify-artist-thumb" />
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
