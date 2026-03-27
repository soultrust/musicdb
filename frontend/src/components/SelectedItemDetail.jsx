import TrackList from "./TrackList";
import DetailOverview from "./DetailOverview";
import { useDetailShellContext } from "../hooks/useMusicDbApp";

export default function SelectedItemDetail() {
  const s = useDetailShellContext();
  return (
    <div className="detail">
      {s.detailLoading && <p className="detail-loading">Loading details…</p>}
      {s.detailData && (
        <div className="detail-columns">
          <div className="detail-main">
            <div className="detail-header">
              <div className="detail-thumb-container">
                {s.detailData.thumb || s.detailData.images?.[0]?.uri ? (
                  s.albumArtReady ? (
                    <img
                      key={s.albumArtRetryKey}
                      src={`${s.detailData.thumb || s.detailData.images?.[0]?.uri}${s.albumArtRetryKey ? `?retry=${s.albumArtRetryKey}` : ""}`}
                      alt={s.detailData.title || s.selectedItem.title}
                      className="detail-thumb"
                      onError={(e) => {
                        if (s.albumArtRetryKey < 2) {
                          s.setAlbumArtRetryKey((k) => k + 1);
                        } else {
                          e.target.style.display = "none";
                        }
                      }}
                    />
                  ) : (
                    <div className="detail-thumb-placeholder">Loading…</div>
                  )
                ) : (
                  <div className="detail-thumb-placeholder">No Image</div>
                )}

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
                  {(s.detailData.title || s.selectedItem.title || "")
                    .toLowerCase()
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </h2>
                <div className="detail-meta">
                  {s.detailData.artists && s.detailData.artists.length > 0 && (
                    <div className="detail-row">
                      <span className="label">Artist:</span>
                      <span className="value">{s.detailData.artists.map((a) => a.name).join(", ")}</span>
                    </div>
                  )}
                  {s.detailData.year && (
                    <div className="detail-row">
                      <span className="label">Year:</span>
                      <span className="value">{s.detailData.year}</span>
                    </div>
                  )}
                  {s.detailData.formats && s.detailData.formats.length > 0 && (
                    <div className="detail-row">
                      <span className="label">Format:</span>
                      <span className="value">
                        {s.detailData.formats
                          .map((f) => f.name + (f.qty ? ` (${f.qty})` : ""))
                          .join(", ")}
                      </span>
                    </div>
                  )}
                  {s.detailData.country && (
                    <div className="detail-row">
                      <span className="label">Country:</span>
                      <span className="value">{s.detailData.country}</span>
                    </div>
                  )}
                  {s.detailData.genres && s.detailData.genres.length > 0 && (
                    <div className="detail-row">
                      <span className="label">Genre:</span>
                      <span className="value">{s.detailData.genres.join(", ")}</span>
                    </div>
                  )}
                  {s.detailData.styles && s.detailData.styles.length > 0 && (
                    <div className="detail-row">
                      <span className="label">Style:</span>
                      <span className="value">{s.detailData.styles.join(", ")}</span>
                    </div>
                  )}
                  {s.detailData.labels && s.detailData.labels.length > 0 && (
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
            {s.detailData.tracklist && s.detailData.tracklist.length > 0 && <TrackList />}
            {s.detailData.profile && (
              <div className="detail-profile">
                <h3>Profile</h3>
                <p>{s.detailData.profile}</p>
              </div>
            )}
          </div>
          <div className="detail-sidebar">
            <DetailOverview />
          </div>
        </div>
      )}
    </div>
  );
}
