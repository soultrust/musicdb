export default function DetailOverview({ detailData, selectedItem, overviewLoading, overview, overviewError }) {
  if (!(overviewLoading || overview || overviewError)) return null;

  return (
    <div className="detail-overview">
      <h3>Overview</h3>
      {(detailData?.uri ||
        selectedItem?.type === "release" ||
        selectedItem?.type === "master" ||
        selectedItem?.type === "artist" ||
        selectedItem?.type === "album" ||
        selectedItem?.type === "song") && (
        <div className="detail-row detail-row-links">
          {detailData?.uri && (
            <a
              href={detailData.uri}
              target="_blank"
              rel="noopener noreferrer"
              className="detail-link"
            >
              View on MusicBrainz →
            </a>
          )}
        </div>
      )}
      {overviewLoading && <p className="detail-loading">Loading overview…</p>}
      {overviewError && !overviewLoading && (
        <p className="error">
          {overviewError.includes("Wikipedia") && overviewError.toLowerCase().includes("no ")
            ? "No overview available for this album."
            : overviewError}
        </p>
      )}
      {overview && !overviewLoading && <p className="overview-text">{overview}</p>}
    </div>
  );
}

