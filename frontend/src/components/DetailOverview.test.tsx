import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DetailOverviewSliceContext } from "../context/musicDbSliceContexts";
import { buildDetailOverviewSliceValue } from "../test/sliceFixtures";
import type { DetailData, DetailOverviewSliceValue } from "../types/musicDbSlices";
import DetailOverview from "./DetailOverview";

function renderDetailOverview(overrides: Partial<DetailOverviewSliceValue> = {}) {
  const value = buildDetailOverviewSliceValue(overrides);
  render(
    <DetailOverviewSliceContext.Provider value={value}>
      <DetailOverview />
    </DetailOverviewSliceContext.Provider>,
  );
  return value;
}

describe("DetailOverview", () => {
  it("renders nothing when there is no loading, overview, or error", () => {
    renderDetailOverview();
    expect(screen.queryByRole("heading", { name: "Overview" })).not.toBeInTheDocument();
  });

  it("shows loading state", () => {
    renderDetailOverview({ overviewLoading: true });
    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByText("Loading overview…")).toBeInTheDocument();
  });

  it("renders overview text when loaded", () => {
    renderDetailOverview({
      overview: "A landmark album.",
      overviewLoading: false,
    });
    expect(screen.getByText("A landmark album.")).toHaveClass("overview-text");
  });

  it("renders newline-separated overview as multiple paragraphs", () => {
    const { container } = render(
      <DetailOverviewSliceContext.Provider
        value={buildDetailOverviewSliceValue({
          overview: "First paragraph.\nSecond paragraph.",
          overviewLoading: false,
        })}
      >
        <DetailOverview />
      </DetailOverviewSliceContext.Provider>,
    );
    const paragraphs = container.querySelectorAll("p.overview-text");
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0]).toHaveTextContent("First paragraph.");
    expect(paragraphs[1]).toHaveTextContent("Second paragraph.");
  });

  it("shows generic error text", () => {
    renderDetailOverview({
      overviewError: "Overview service unavailable.",
      overviewLoading: false,
    });
    expect(screen.getByText("Overview service unavailable.")).toBeInTheDocument();
  });

  it("maps Wikipedia no-overview errors to friendly copy", () => {
    renderDetailOverview({
      overviewError: "Wikipedia says no article",
      overviewLoading: false,
    });
    expect(screen.getByText("No overview available for this album.")).toBeInTheDocument();
  });

  it("does not show a MusicBrainz link in the overview block", () => {
    renderDetailOverview({
      detailData: { uri: "https://musicbrainz.org/release/1", title: "X" } as DetailData,
      overview: "Overview text.",
      overviewLoading: false,
    });
    expect(screen.queryByRole("link", { name: /view on musicbrainz/i })).not.toBeInTheDocument();
  });
});
