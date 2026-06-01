import { useCallback, useState, type FormEvent } from "react";
import type { AuthFetchFn } from "../services/especiallyLikedApi";
import {
  discogsReleaseImagesUrl,
  discogsReleaseSearchUrl,
  manualAlbumImageUrl,
  spotifyAlbumImagesUrl,
  spotifyAlbumSearchUrl,
} from "../services/searchApi";

export type ImageSource = "spotify" | "discogs";

type ImageRow = { url: string; width?: number | null; height?: number | null };

type PickRow = {
  id: string;
  title: string;
  thumbUrl?: string | null;
};

export default function AlbumManualImageModal({
  API_BASE,
  authFetch,
  musicbrainzReleaseGroupId,
  albumTitle,
  onClose,
  onSaved,
}: {
  API_BASE: string;
  authFetch: AuthFetchFn;
  musicbrainzReleaseGroupId: string;
  albumTitle: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [source, setSource] = useState<ImageSource>("spotify");
  const [searchQuery, setSearchQuery] = useState(albumTitle);
  const [searchLoading, setSearchLoading] = useState(false);
  const [picks, setPicks] = useState<PickRow[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [picked, setPicked] = useState<PickRow | null>(null);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [images, setImages] = useState<ImageRow[]>([]);
  const [imagesError, setImagesError] = useState<string | null>(null);

  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const resetAfterSourceChange = useCallback((next: ImageSource) => {
    setSource(next);
    setPicks([]);
    setPicked(null);
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
      setPicks([]);
      setPicked(null);
      setImages([]);
      try {
        if (source === "spotify") {
          const res = await authFetch(spotifyAlbumSearchUrl(API_BASE, q, 50));
          const data = (await res.json()) as {
            albums?: Array<{ id?: string; name?: string; images?: Array<{ url?: string }> }>;
            error?: string;
            detail?: string;
          };
          if (!res.ok) {
            const hint = data.detail ? `${data.error ?? "Error"}: ${data.detail}` : data.error;
            setSearchError(hint || `Search failed (${res.status})`);
            return;
          }
          const rows: PickRow[] = (data.albums || [])
            .map((a) => ({
              id: String(a.id ?? ""),
              title: a.name || "",
              thumbUrl: a.images?.find((im) => im?.url)?.url ?? null,
            }))
            .filter((r) => r.id);
          setPicks(rows);
        } else {
          const res = await authFetch(discogsReleaseSearchUrl(API_BASE, q, 100));
          const data = (await res.json()) as {
            releases?: Array<{ id?: number | string; title?: string; thumb?: string }>;
            error?: string;
            detail?: string;
          };
          if (!res.ok) {
            const hint = data.detail ? `${data.error ?? "Error"}: ${data.detail}` : data.error;
            setSearchError(hint || `Search failed (${res.status})`);
            return;
          }
          const rows: PickRow[] = (data.releases || [])
            .map((r) => ({
              id: String(r.id ?? ""),
              title: r.title || "",
              thumbUrl: r.thumb || null,
            }))
            .filter((row) => row.id);
          setPicks(rows);
        }
      } catch {
        setSearchError("Search failed.");
      } finally {
        setSearchLoading(false);
      }
    },
    [API_BASE, authFetch, searchQuery, source],
  );

  const pickRow = useCallback(
    async (row: PickRow) => {
      const id = row.id;
      if (!id) return;
      setPicked(row);
      setImagesLoading(true);
      setImagesError(null);
      setImages([]);
      try {
        const res =
          source === "spotify"
            ? await authFetch(spotifyAlbumImagesUrl(API_BASE, id))
            : await authFetch(discogsReleaseImagesUrl(API_BASE, id));
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
        const res = await authFetch(manualAlbumImageUrl(API_BASE), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            musicbrainz_release_group_id: musicbrainzReleaseGroupId,
            image_url: imageUrl,
            spotify_album_id: source === "spotify" && picked?.id ? picked.id : "",
            discogs_release_id: source === "discogs" && picked?.id ? picked.id : "",
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
    [API_BASE, authFetch, musicbrainzReleaseGroupId, onClose, onSaved, picked?.id, source],
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content artist-manual-image-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Choose album cover</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">
          <p className="artist-manual-image-intro">
            Search <strong>{albumTitle}</strong> on Spotify or Discogs, pick a matching album or
            release, then choose a cover. This overrides the automatic cover for your account only.
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
            <label htmlFor="album-manual-search-q">Search</label>
            <div className="artist-spotify-image-search-row">
              <input
                id="album-manual-search-q"
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

          {picks.length > 0 && (
            <div className="artist-spotify-image-section">
              <h3>{source === "spotify" ? "Albums" : "Releases"}</h3>
              <ul className="artist-spotify-artist-picks">
                {picks.map((row) => (
                  <li key={`${source}-${row.id}`}>
                    <button
                      type="button"
                      className={
                        picked?.id === row.id
                          ? "artist-spotify-artist-pick is-active"
                          : "artist-spotify-artist-pick"
                      }
                      onClick={() => void pickRow(row)}
                    >
                      {row.thumbUrl && (
                        <img src={row.thumbUrl} alt="" className="artist-spotify-artist-thumb" />
                      )}
                      <span className="artist-spotify-artist-name">{row.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {picked && (
            <div className="artist-spotify-image-section">
              <h3>Images for “{picked.title}”</h3>
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
