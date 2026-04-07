import { Fragment, useState } from "react";
import TrackList from "./TrackList";
import DetailOverview from "./DetailOverview";
import ArtistManualImageModal from "./ArtistManualImageModal";
import { useDetailShellContext, useDetailOverviewContext } from "../hooks/useMusicDbApp";
import { manualSpotifyArtistImageUrl } from "../services/searchApi";

/** Title case for display (MusicBrainz often returns ALL CAPS). */
function titleCaseDisplay(value: string): string {
  const t = value.trim();
  if (!t) return value;
  return t.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function ArtistImage({
  s,
  isArtist,
}: {
  s: ReturnType<typeof useDetailShellContext>;
  isArtist: boolean;
}) {
  if (!s.detailData) return null;
  if (s.detailData.thumb || s.detailData.images?.[0]?.uri) {
    return s.albumArtReady ? (
      <img
        key={s.albumArtRetryKey}
        src={`${s.detailData.thumb || s.detailData.images?.[0]?.uri}${s.albumArtRetryKey ? `?retry=${s.albumArtRetryKey}` : ""}`}
        alt={s.detailData.title || s.selectedItem?.title || ""}
        className={`detail-thumb${isArtist ? " detail-thumb-artist" : ""}`}
        onError={(e) => {
          if (s.albumArtRetryKey < 2) {
            s.setAlbumArtRetryKey((k) => k + 1);
          } else {
            e.currentTarget.style.display = "none";
          }
        }}
      />
    ) : (
      <div className="detail-thumb-placeholder">Loading…</div>
    );
  }
  return <div className="detail-thumb-placeholder">No Image</div>;
}

function ArtistDetailLayout({
  s,
  mbArtistId,
  setShowArtistManualImageModal,
  removeManualImageLoading,
  handleRemoveManualArtistImage,
}: {
  s: ReturnType<typeof useDetailShellContext>;
  mbArtistId: string;
  setShowArtistManualImageModal: (v: boolean) => void;
  removeManualImageLoading: boolean;
  handleRemoveManualArtistImage: () => Promise<void>;
}) {
  const ov = useDetailOverviewContext();

  return (
    <>
      <div className="detail-main">
        <h2 className="detail-title">
          {titleCaseDisplay(s.detailData?.title || s.selectedItem?.title || "")}
        </h2>
        <div className="artist-detail-body">
          <div className="artist-detail-image-float">
            <ArtistImage s={s} isArtist />
          </div>
          {ov.overviewLoading && <p className="detail-loading">Loading overview…</p>}
          {ov.overviewError && !ov.overviewLoading && (
            <p className="error overview-error">
              {ov.overviewError.includes("Wikipedia") &&
              ov.overviewError.toLowerCase().includes("no ")
                ? "No overview available for this artist."
                : ov.overviewError}
            </p>
          )}
          {ov.overview && !ov.overviewLoading && (
            <p className="overview-text">{ov.overview}</p>
          )}
          <div className="artist-detail-actions">
            {mbArtistId && (
              <div className="detail-artist-image-actions detail-artist-image-actions--inline">
                <button
                  type="button"
                  className="add-to-list-btn"
                  onClick={() => setShowArtistManualImageModal(true)}
                >
                  Choose artist image
                </button>
                {s.detailData?.manual_spotify_artist_image ? (
                  <button
                    type="button"
                    className="detail-remove-manual-artist-image-btn"
                    onClick={() => void handleRemoveManualArtistImage()}
                    disabled={removeManualImageLoading}
                  >
                    {removeManualImageLoading ? "Removing…" : "Remove manual image"}
                  </button>
                ) : null}
              </div>
            )}
            {s.detailData?.uri && (
              <div className="detail-row detail-row-links">
                <a
                  href={s.detailData.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="detail-link"
                >
                  View on MusicBrainz →
                </a>
              </div>
            )}
          </div>
        </div>
        {Array.isArray(s.detailData?.albums) && s.detailData!.albums!.length > 0 && (
          <div className="detail-artist-albums">
            <h3>Albums</h3>
            <ul className="detail-artist-albums-list">
              {s.detailData!.albums!.map((al) => (
                <li key={al.id}>
                  <button
                    type="button"
                    className="detail-link"
                    onClick={() =>
                      void s.handleItemClick({
                        id: String(al.id),
                        type: "album",
                        title: al.title ?? "",
                      })
                    }
                  >
                    {al.year ? `${al.year} — ` : ""}
                    {al.title ? titleCaseDisplay(al.title) : al.id}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {s.detailData?.profile && (
          <div className="detail-profile">
            <h3>Profile</h3>
            <p>{s.detailData.profile}</p>
          </div>
        )}
      </div>
      <div className="detail-sidebar" />
    </>
  );
}

function AlbumDetailLayout({
  s,
}: {
  s: ReturnType<typeof useDetailShellContext>;
}) {
  return (
    <>
      <div className="detail-main">
        <div className="detail-header">
          <div className="detail-thumb-container">
            <ArtistImage s={s} isArtist={false} />
            {(s.selectedItem?.type === "release" ||
              s.selectedItem?.type === "master" ||
              s.selectedItem?.type === "album") && (
              <button onClick={s.handleAddToList} className="add-to-list-btn">
                Manage Lists
              </button>
            )}
          </div>
          <div className="detail-content">
            <h2 className="detail-title">
              {titleCaseDisplay(s.detailData?.title || s.selectedItem?.title || "")}
            </h2>
            <div className="detail-meta">
              {s.detailData?.artists && s.detailData.artists.length > 0 && (
                <div className="detail-row">
                  <span className="label">Artist:</span>
                  <span className="value detail-row-links">
                    {s.detailData.artists.map((a, i) => {
                      const name = a.name;
                      const mbid = a.id;
                      const isAlbumish =
                        s.selectedItem?.type === "release" ||
                        s.selectedItem?.type === "master" ||
                        s.selectedItem?.type === "album";
                      const showLink = Boolean(isAlbumish && mbid && name);
                      return (
                        <Fragment key={`${mbid ?? name}-${i}`}>
                          {i > 0 ? ", " : null}
                          {showLink ? (
                            <button
                              type="button"
                              className="detail-link"
                              onClick={() =>
                                void s.handleItemClick({
                                  id: mbid ?? "",
                                  type: "artist",
                                  title: name,
                                })
                              }
                            >
                              {titleCaseDisplay(name)}
                            </button>
                          ) : (
                            <span>{titleCaseDisplay(name)}</span>
                          )}
                        </Fragment>
                      );
                    })}
                  </span>
                </div>
              )}
              {s.detailData?.year && (
                <div className="detail-row">
                  <span className="label">Year:</span>
                  <span className="value">{s.detailData.year}</span>
                </div>
              )}
              {s.detailData?.formats && s.detailData.formats.length > 0 && (
                <div className="detail-row">
                  <span className="label">Format:</span>
                  <span className="value">
                    {s.detailData.formats
                      .map((f) => f.name + (f.qty ? ` (${f.qty})` : ""))
                      .join(", ")}
                  </span>
                </div>
              )}
              {s.detailData?.country && (
                <div className="detail-row">
                  <span className="label">Country:</span>
                  <span className="value">{s.detailData.country}</span>
                </div>
              )}
              {s.detailData?.genres && s.detailData.genres.length > 0 && (
                <div className="detail-row">
                  <span className="label">Genre:</span>
                  <span className="value">{s.detailData.genres.join(", ")}</span>
                </div>
              )}
              {s.detailData?.styles && s.detailData.styles.length > 0 && (
                <div className="detail-row">
                  <span className="label">Style:</span>
                  <span className="value">{s.detailData.styles.join(", ")}</span>
                </div>
              )}
              {s.detailData?.labels && s.detailData.labels.length > 0 && (
                <div className="detail-row">
                  <span className="label">Label:</span>
                  <span className="value">
                    {s.detailData.labels
                      .map((l) => l.name + (l.catno ? ` (${l.catno})` : ""))
                      .join(", ")}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        {s.detailData?.tracklist && s.detailData.tracklist.length > 0 && <TrackList />}
        {s.detailData?.profile && (
          <div className="detail-profile">
            <h3>Profile</h3>
            <p>{s.detailData.profile}</p>
          </div>
        )}
      </div>
      <div className="detail-sidebar">
        <DetailOverview />
      </div>
    </>
  );
}

export default function SelectedItemDetail() {
  const s = useDetailShellContext();
  const [showArtistManualImageModal, setShowArtistManualImageModal] = useState(false);
  const [removeManualImageLoading, setRemoveManualImageLoading] = useState(false);

  const isArtist = s.selectedItem?.type === "artist";
  const mbArtistId = isArtist ? String(s.selectedItem?.id ?? "") : "";

  const handleRemoveManualArtistImage = async () => {
    if (!mbArtistId) return;
    setRemoveManualImageLoading(true);
    try {
      const res = await s.authFetch(manualSpotifyArtistImageUrl(s.API_BASE, mbArtistId), {
        method: "DELETE",
      });
      if (res.ok || res.status === 404) await s.refreshDetail();
    } finally {
      setRemoveManualImageLoading(false);
    }
  };

  return (
    <div className="detail">
      {s.detailLoading && <p className="detail-loading">Loading details…</p>}
      {s.detailData && (
        <div className="detail-columns">
          {isArtist ? (
            <ArtistDetailLayout
              s={s}
              mbArtistId={mbArtistId}
              setShowArtistManualImageModal={setShowArtistManualImageModal}
              removeManualImageLoading={removeManualImageLoading}
              handleRemoveManualArtistImage={handleRemoveManualArtistImage}
            />
          ) : (
            <AlbumDetailLayout s={s} />
          )}
        </div>
      )}
      {showArtistManualImageModal && isArtist && mbArtistId && (
        <ArtistManualImageModal
          API_BASE={s.API_BASE}
          authFetch={s.authFetch}
          musicbrainzArtistId={mbArtistId}
          artistTitle={s.detailData?.title || s.selectedItem?.title || ""}
          onClose={() => setShowArtistManualImageModal(false)}
          onSaved={s.refreshDetail}
        />
      )}
    </div>
  );
}
