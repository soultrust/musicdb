import { Fragment, useEffect, useState } from "react";
import TrackList from "./TrackList";
import DetailOverview from "./DetailOverview";
import OverviewParagraphs from "./OverviewParagraphs";
import AlbumManualImageModal from "./AlbumManualImageModal";
import ArtistManualImageModal from "./ArtistManualImageModal";
import { useDetailShellContext, useDetailOverviewContext } from "../hooks/useMusicDbApp";
import { manualAlbumImageUrl, manualSpotifyArtistImageUrl } from "../services/searchApi";

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
  const [showAllAlbums, setShowAllAlbums] = useState(false);
  useEffect(() => {
    setShowAllAlbums(false);
  }, [mbArtistId]);
  const artistAlbums = s.detailData?.albums ?? [];
  const albumsPreviewLimit = 25;
  const visibleAlbums = showAllAlbums
    ? artistAlbums
    : artistAlbums.slice(0, albumsPreviewLimit);
  const hiddenAlbumCount = Math.max(0, artistAlbums.length - albumsPreviewLimit);

  return (
    <>
      <div className="detail-main">
        <div className="artist-detail-header">
          <div className="artist-detail-image-float">
            <ArtistImage s={s} isArtist />
          </div>
          <div className="artist-detail-heading">
            <h2 className="detail-title">
              {titleCaseDisplay(s.detailData?.title || s.selectedItem?.title || "")}
            </h2>
            {(s.detailData?.members?.length ?? 0) > 0 && (
              <ul className="artist-members">
                {s.detailData!.members!.map((m) => {
                  const instruments = (m.instruments || []).join(", ");
                  return (
                    <li key={m.id} className="artist-member">
                      <button
                        type="button"
                        className="detail-link artist-member-name"
                        onClick={() =>
                          void s.handleItemClick({
                            id: m.id,
                            type: "artist",
                            title: m.name,
                          })
                        }
                      >
                        {titleCaseDisplay(m.name)}
                      </button>
                      {instruments ? (
                        <span className="artist-member-instruments"> — {instruments}</span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
        <div className="artist-detail-body">
          {ov.overviewLoading && <p className="detail-loading">Loading overview…</p>}
          {ov.overviewError && !ov.overviewLoading && (
            <p className="error overview-error">
              {ov.overviewError.includes("Wikipedia") &&
                ov.overviewError.toLowerCase().includes("no ")
                ? "No overview available for this artist."
                : ov.overviewError}
            </p>
          )}
          {ov.overview && !ov.overviewLoading && <OverviewParagraphs overview={ov.overview} />}
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
        {artistAlbums.length > 0 && (
          <div className="detail-artist-albums">
            <h3>Studio albums</h3>
            <ul className="detail-artist-albums-list">
              {visibleAlbums.map((al) => (
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
            {!showAllAlbums && hiddenAlbumCount > 0 ? (
              <button
                type="button"
                className="detail-link artist-albums-show-more"
                onClick={() => setShowAllAlbums(true)}
              >
                Show {hiddenAlbumCount} more album{hiddenAlbumCount === 1 ? "" : "s"}
              </button>
            ) : null}
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
  mbReleaseGroupId,
  setShowAlbumManualImageModal,
  removeManualAlbumImageLoading,
  handleRemoveManualAlbumImage,
}: {
  s: ReturnType<typeof useDetailShellContext>;
  mbReleaseGroupId: string;
  setShowAlbumManualImageModal: (v: boolean) => void;
  removeManualAlbumImageLoading: boolean;
  handleRemoveManualAlbumImage: () => Promise<void>;
}) {
  const isAlbumish =
    s.selectedItem?.type === "release" ||
    s.selectedItem?.type === "master" ||
    s.selectedItem?.type === "album";

  return (
    <>
      <div className="detail-main">
        <div className="detail-header">
          <div className="detail-thumb-container">
            <ArtistImage s={s} isArtist={false} />
            {isAlbumish && mbReleaseGroupId && (
              <div className="detail-artist-image-actions">
                <button
                  type="button"
                  className="add-to-list-btn"
                  onClick={() => setShowAlbumManualImageModal(true)}
                >
                  Choose album cover
                </button>
                {s.detailData?.manual_album_image ? (
                  <button
                    type="button"
                    className="detail-remove-manual-artist-image-btn"
                    onClick={() => void handleRemoveManualAlbumImage()}
                    disabled={removeManualAlbumImageLoading}
                  >
                    {removeManualAlbumImageLoading ? "Removing…" : "Remove manual cover"}
                  </button>
                ) : null}
              </div>
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
        {(s.selectedItem?.type === "release" ||
          s.selectedItem?.type === "master" ||
          s.selectedItem?.type === "album") && (
            <button onClick={s.handleAddToList} className="add-to-list-btn">
              Manage Lists
            </button>
          )}
        {s.detailData?.tracklist && s.detailData.tracklist.length > 0 && <TrackList />}
        {s.detailData?.uri && (
          <div className="detail-row detail-row-links detail-musicbrainz-link">
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
  const [showAlbumManualImageModal, setShowAlbumManualImageModal] = useState(false);
  const [removeManualImageLoading, setRemoveManualImageLoading] = useState(false);
  const [removeManualAlbumImageLoading, setRemoveManualAlbumImageLoading] = useState(false);

  const isArtist = s.selectedItem?.type === "artist";
  const mbArtistId = isArtist ? String(s.selectedItem?.id ?? "") : "";
  const mbReleaseGroupId = String(
    s.detailData?.release_group_id ?? (s.selectedItem?.type === "album" ? s.selectedItem?.id : "") ?? "",
  );

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

  const handleRemoveManualAlbumImage = async () => {
    if (!mbReleaseGroupId) return;
    setRemoveManualAlbumImageLoading(true);
    try {
      const res = await s.authFetch(manualAlbumImageUrl(s.API_BASE, mbReleaseGroupId), {
        method: "DELETE",
      });
      if (res.ok || res.status === 404) await s.refreshDetail();
    } finally {
      setRemoveManualAlbumImageLoading(false);
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
            <AlbumDetailLayout
              s={s}
              mbReleaseGroupId={mbReleaseGroupId}
              setShowAlbumManualImageModal={setShowAlbumManualImageModal}
              removeManualAlbumImageLoading={removeManualAlbumImageLoading}
              handleRemoveManualAlbumImage={handleRemoveManualAlbumImage}
            />
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
      {showAlbumManualImageModal && !isArtist && mbReleaseGroupId && (
        <AlbumManualImageModal
          API_BASE={s.API_BASE}
          authFetch={s.authFetch}
          musicbrainzReleaseGroupId={mbReleaseGroupId}
          albumTitle={s.detailData?.title || s.selectedItem?.title || ""}
          onClose={() => setShowAlbumManualImageModal(false)}
          onSaved={s.refreshDetail}
        />
      )}
    </div>
  );
}
