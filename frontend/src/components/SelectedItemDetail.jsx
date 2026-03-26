import TrackList from "./TrackList";
import DetailOverview from "./DetailOverview";

export default function SelectedItemDetail({
  detailLoading,
  detailData,
  selectedItem,
  albumArtReady,
  albumArtRetryKey,
  setAlbumArtRetryKey,
  handleAddToList,
  spotifyMatching,
  autoplay,
  setAutoplay,
  tracklistFilter,
  setTracklistFilter,
  getDisplayLikeState,
  spotifyMatches,
  currentTrack,
  playbackDuration,
  playbackPosition,
  getTrackKey,
  handleTrackRowClick,
  playTrack,
  openSpotifySearchModal,
  toggleLikeTrack,
  spotifyToken,
  overviewLoading,
  overview,
  overviewError,
}) {
  return (
    <div className="detail">
      {detailLoading && <p className="detail-loading">Loading details…</p>}
      {detailData && (
        <div className="detail-columns">
          <div className="detail-main">
            <div className="detail-header">
              <div className="detail-thumb-container">
                {detailData.thumb || detailData.images?.[0]?.uri ? (
                  albumArtReady ? (
                    <img
                      key={albumArtRetryKey}
                      src={`${detailData.thumb || detailData.images?.[0]?.uri}${albumArtRetryKey ? `?retry=${albumArtRetryKey}` : ""}`}
                      alt={detailData.title || selectedItem.title}
                      className="detail-thumb"
                      onError={(e) => {
                        if (albumArtRetryKey < 2) {
                          setAlbumArtRetryKey((k) => k + 1);
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

                {(selectedItem?.type === "release" ||
                  selectedItem?.type === "master" ||
                  selectedItem?.type === "album") && (
                  <button onClick={handleAddToList} className="add-to-list-btn">
                    Manage Lists
                  </button>
                )}
              </div>
              <div className="detail-content">
                <h2 className="detail-title">
                  {(detailData.title || selectedItem.title || "")
                    .toLowerCase()
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </h2>
                <div className="detail-meta">
                  {detailData.artists && detailData.artists.length > 0 && (
                    <div className="detail-row">
                      <span className="label">Artist:</span>
                      <span className="value">{detailData.artists.map((a) => a.name).join(", ")}</span>
                    </div>
                  )}
                  {detailData.year && (
                    <div className="detail-row">
                      <span className="label">Year:</span>
                      <span className="value">{detailData.year}</span>
                    </div>
                  )}
                  {detailData.formats && detailData.formats.length > 0 && (
                    <div className="detail-row">
                      <span className="label">Format:</span>
                      <span className="value">
                        {detailData.formats
                          .map((f) => f.name + (f.qty ? ` (${f.qty})` : ""))
                          .join(", ")}
                      </span>
                    </div>
                  )}
                  {detailData.country && (
                    <div className="detail-row">
                      <span className="label">Country:</span>
                      <span className="value">{detailData.country}</span>
                    </div>
                  )}
                  {detailData.genres && detailData.genres.length > 0 && (
                    <div className="detail-row">
                      <span className="label">Genre:</span>
                      <span className="value">{detailData.genres.join(", ")}</span>
                    </div>
                  )}
                  {detailData.styles && detailData.styles.length > 0 && (
                    <div className="detail-row">
                      <span className="label">Style:</span>
                      <span className="value">{detailData.styles.join(", ")}</span>
                    </div>
                  )}
                  {detailData.labels && detailData.labels.length > 0 && (
                    <div className="detail-row">
                      <span className="label">Label:</span>
                      <span className="value">
                        {detailData.labels
                          .map((l) => l.name + (l.catno ? ` (${l.catno})` : ""))
                          .join(", ")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {detailData.tracklist && detailData.tracklist.length > 0 && (
              <TrackList
                tracklist={detailData.tracklist}
                spotifyMatching={spotifyMatching}
                autoplay={autoplay}
                setAutoplay={setAutoplay}
                tracklistFilter={tracklistFilter}
                setTracklistFilter={setTracklistFilter}
                getDisplayLikeState={getDisplayLikeState}
                spotifyMatches={spotifyMatches}
                currentTrack={currentTrack}
                playbackDuration={playbackDuration}
                playbackPosition={playbackPosition}
                getTrackKey={getTrackKey}
                handleTrackRowClick={handleTrackRowClick}
                playTrack={playTrack}
                openSpotifySearchModal={openSpotifySearchModal}
                toggleLikeTrack={toggleLikeTrack}
                spotifyToken={spotifyToken}
              />
            )}
            {detailData.profile && (
              <div className="detail-profile">
                <h3>Profile</h3>
                <p>{detailData.profile}</p>
              </div>
            )}
          </div>
          <div className="detail-sidebar">
            <DetailOverview
              detailData={detailData}
              selectedItem={selectedItem}
              overviewLoading={overviewLoading}
              overview={overview}
              overviewError={overviewError}
            />
          </div>
        </div>
      )}
    </div>
  );
}

