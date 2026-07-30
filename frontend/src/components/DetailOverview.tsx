import { useDetailOverviewContext } from "../hooks/useMusicDbApp";
import OverviewParagraphs from "./OverviewParagraphs";

export default function DetailOverview() {
  const { selectedItem, overviewLoading, overview, overviewError } = useDetailOverviewContext();

  if (!(overviewLoading || overview || overviewError)) return null;

  return (
    <div className="detail-overview">
      <h3>Overview</h3>
      {overviewLoading && <p className="detail-loading">Loading overview…</p>}
      {overviewError && !overviewLoading && (
        <p className="error">
          {overviewError.includes("Wikipedia") && overviewError.toLowerCase().includes("no ")
            ? `No overview available for this ${selectedItem?.type === "artist" ? "artist" : "album"}.`
            : overviewError}
        </p>
      )}
      {overview && !overviewLoading && <OverviewParagraphs overview={overview} />}
    </div>
  );
}
