import TrackList from "./TrackList";
import DetailOverview from "./DetailOverview";
import { useMusicDbApp } from "../hooks/useMusicDbApp";

export default function SelectedItemDetail() {
  const { detailPanel: d } = useMusicDbApp();
  return (
    <div className="detail">
      {d.detailLoading && <p className="detail-loading">Loading details…</p>}
      {d.detailData && (
        <div className="detail-columns">
          <div className="detail-main">
            <div className="detail-header">
              <div className="detail-thumb-container">
                {d.detailData.thumb || d.detailData.images?.[0]?.uri ? (
                  d.albumArtReady ? (
                    <img
                      key={d.albumArtRetryKey}
                      src={`${d.detailData.thumb || d.detailData.images?.[0]?.uri}${d.albumArtRetryKey ? `?retry=${d.albumArtRetryKey}` : ""}`}
                      alt={d.detailData.title || d.selectedItem.title}
                      className="detail-thumb"
                      onError={(e) => {
                        if (d.albumArtRetryKey < 2) {
                          d.setAlbumArtRetryKey((k) => k + 1);
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

                {(d.selectedItem?.type === "release" ||
                  d.selectedItem?.type === "master" ||
                  d.selectedItem?.type === "album") && (
                  <button onClick={d.handleAddToList} className="add-to-list-btn">
                    Manage Lists
                  </button>
                )}
              </div>
              <div className="detail-content">
                <h2 className="detail-title">
                  {(d.detailData.title || d.selectedItem.title || "")
                    .toLowerCase()
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </h2>
                <div className="detail-meta">
                  {d.detailData.artists && d.detailData.artists.length > 0 && (
                    <div className="detail-row">
                      <span className="label">Artist:</span>
                      <span className="value">{d.detailData.artists.map((a) => a.name).join(", ")}</span>
                    </div>
                  )}
                  {d.detailData.year && (
                    <div className="detail-row">
                      <span className="label">Year:</span>
                      <span className="value">{d.detailData.year}</span>
                    </div>
                  )}
                  {d.detailData.formats && d.detailData.formats.length > 0 && (
                    <div className="detail-row">
                      <span className="label">Format:</span>
                      <span className="value">
                        {d.detailData.formats
                          .map((f) => f.name + (f.qty ? ` (${f.qty})` : ""))
                          .join(", ")}
                      </span>
                    </div>
                  )}
                  {d.detailData.country && (
                    <div className="detail-row">
                      <span className="label">Country:</span>
                      <span className="value">{d.detailData.country}</span>
                    </div>
                  )}
                  {d.detailData.genres && d.detailData.genres.length > 0 && (
                    <div className="detail-row">
                      <span className="label">Genre:</span>
                      <span className="value">{d.detailData.genres.join(", ")}</span>
                    </div>
                  )}
                  {d.detailData.styles && d.detailData.styles.length > 0 && (
                    <div className="detail-row">
                      <span className="label">Style:</span>
                      <span className="value">{d.detailData.styles.join(", ")}</span>
                    </div>
                  )}
                  {d.detailData.labels && d.detailData.labels.length > 0 && (
                    <div className="detail-row">
                      <span className="label">Label:</span>
                      <span className="value">
                        {d.detailData.labels
                          .map((l) => l.name + (l.catno ? ` (${l.catno})` : ""))
                          .join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {d.detailData.tracklist && d.detailData.tracklist.length > 0 && (
              <TrackList
                tracklist={d.detailData.tracklist}
                spotifyMatching={d.spotifyMatching}
                autoplay={d.autoplay}
                setAutoplay={d.setAutoplay}
                tracklistFilter={d.tracklistFilter}
                setTracklistFilter={d.setTracklistFilter}
                getDisplayLikeState={d.getDisplayLikeState}
                spotifyMatches={d.spotifyMatches}
                currentTrack={d.currentTrack}
                playbackDuration={d.playbackDuration}
                playbackPosition={d.playbackPosition}
                getTrackKey={d.getTrackKey}
                handleTrackRowClick={d.handleTrackRowClick}
                playTrack={d.playTrack}
                openSpotifySearchModal={d.openSpotifySearchModal}
                toggleLikeTrack={d.toggleLikeTrack}
                spotifyToken={d.spotifyToken}
              />
            )}
            {d.detailData.profile && (
              <div className="detail-profile">
                <h3>Profile</h3>
                <p>{d.detailData.profile}</p>
              </div>
            )}
          </div>
          <div className="detail-sidebar">
            <DetailOverview
              detailData={d.detailData}
              selectedItem={d.selectedItem}
              overviewLoading={d.overviewLoading}
              overview={d.overview}
              overviewError={d.overviewError}
            />
          </div>
        </div>
      )}
    </div>
  );
}
