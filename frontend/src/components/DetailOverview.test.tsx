import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DetailOverviewSliceContext } from "../context/musicDbSliceContexts";
import type { DetailData, DetailItem, DetailOverviewSliceValue } from "../types/musicDbSlices";
import DetailOverview from "./DetailOverview";

function buildOverviewValue(overrides: Partial<DetailOverviewSliceValue> = {}): DetailOverviewSliceValue {
  return {
    detailData: null,
    selectedItem: null,
    overviewLoading: false,
    overview: null,
    overviewError: null,
    ...overrides,
  };
}

function renderDetailOverview(overrides: Partial<DetailOverviewSliceValue> = {}) {
  const value = buildOverviewValue(overrides);
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

  it("shows MusicBrainz link when detail has a uri", () => {
    const detailData = { uri: "https://musicbrainz.org/release/1", title: "X" } as DetailData;
    renderDetailOverview({
      detailData,
      overviewLoading: true,
    });
    const link = screen.getByRole("link", { name: /view on musicbrainz/i });
    expect(link).toHaveAttribute("href", "https://musicbrainz.org/release/1");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("shows link row for release-type selected item without uri", () => {
    const selectedItem = { id: "r1", type: "release", title: "Album" } as DetailItem;
    renderDetailOverview({
      detailData: { title: "Album", tracklist: [] } as DetailData,
      selectedItem,
      overviewLoading: true,
    });
    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
  });
});
