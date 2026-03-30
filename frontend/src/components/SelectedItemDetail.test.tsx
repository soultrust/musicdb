import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DetailShellSliceContext } from "../context/musicDbSliceContexts";
import { buildDetailShellSliceValue } from "../test/sliceFixtures";
import type { DetailData, DetailItem, DetailShellSliceValue } from "../types/musicDbSlices";
import SelectedItemDetail from "./SelectedItemDetail";

vi.mock("./TrackList", () => ({
  default: () => <div data-testid="track-list" />,
}));
vi.mock("./DetailOverview", () => ({
  default: () => <div data-testid="detail-overview" />,
}));

function renderSelectedItemDetail(overrides: Partial<DetailShellSliceValue> = {}) {
  const value = buildDetailShellSliceValue(overrides);
  render(
    <DetailShellSliceContext.Provider value={value}>
      <SelectedItemDetail />
    </DetailShellSliceContext.Provider>,
  );
  return value;
}

describe("SelectedItemDetail", () => {
  it("shows loading line while detail is loading", () => {
    renderSelectedItemDetail({ detailLoading: true, detailData: null });
    expect(screen.getByText("Loading details…")).toBeInTheDocument();
  });

  it("renders nothing besides loading when detailData is missing", () => {
    renderSelectedItemDetail({ detailLoading: true, detailData: null });
    expect(screen.queryByTestId("detail-overview")).not.toBeInTheDocument();
  });

  it("renders title in title case from detailData", () => {
    renderSelectedItemDetail({
      detailData: { title: "nevermind" } as DetailData,
      selectedItem: { id: "1", type: "album", title: "Nevermind" },
    });
    expect(screen.getByRole("heading", { level: 2, name: "Nevermind" })).toBeInTheDocument();
  });

  it("renders meta rows for artists, year, format, country, genre, style, label", () => {
    renderSelectedItemDetail({
      detailData: {
        title: "Album",
        artists: [{ name: "Artist One" }, { name: "Artist Two" }],
        year: 1991,
        formats: [{ name: "CD", qty: "2" }, { name: "Vinyl" }],
        country: "US",
        genres: ["Rock"],
        styles: ["Grunge"],
        labels: [{ name: "DGC", catno: "123" }],
      } as DetailData,
      selectedItem: { id: "1", type: "album", title: "Album" },
    });
    expect(screen.getByText("Artist One, Artist Two")).toBeInTheDocument();
    expect(screen.getByText("1991")).toBeInTheDocument();
    expect(screen.getByText("CD (2), Vinyl")).toBeInTheDocument();
    expect(screen.getByText("US")).toBeInTheDocument();
    expect(screen.getByText("Rock")).toBeInTheDocument();
    expect(screen.getByText("Grunge")).toBeInTheDocument();
    expect(screen.getByText("DGC (123)")).toBeInTheDocument();
  });

  it("mounts TrackList when tracklist has items", () => {
    renderSelectedItemDetail({
      detailData: {
        title: "A",
        tracklist: [{ title: "T1" }],
      } as DetailData,
      selectedItem: { id: "1", type: "release", title: "A" },
    });
    expect(screen.getByTestId("track-list")).toBeInTheDocument();
  });

  it("does not mount TrackList when tracklist is empty", () => {
    renderSelectedItemDetail({
      detailData: { title: "A", tracklist: [] } as DetailData,
      selectedItem: { id: "1", type: "release", title: "A" },
    });
    expect(screen.queryByTestId("track-list")).not.toBeInTheDocument();
  });

  it("renders profile block when detail has profile text", () => {
    renderSelectedItemDetail({
      detailData: { title: "Artist", profile: "Biography text here." } as DetailData,
      selectedItem: { id: "1", type: "artist", title: "Artist" },
    });
    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByText("Biography text here.")).toBeInTheDocument();
  });

  it("renders DetailOverview in the sidebar", () => {
    renderSelectedItemDetail({
      detailData: { title: "R" } as DetailData,
      selectedItem: { id: "1", type: "release", title: "R" },
    });
    expect(screen.getByTestId("detail-overview")).toBeInTheDocument();
  });

  it("shows album art image when ready and thumb is present", () => {
    renderSelectedItemDetail({
      detailData: { title: "X", thumb: "https://example.com/cover.jpg" } as DetailData,
      selectedItem: { id: "1", type: "release", title: "X" },
      albumArtReady: true,
    });
    const img = screen.getByRole("img", { name: "X" });
    expect(img).toHaveAttribute("src", "https://example.com/cover.jpg");
  });

  it("uses first image uri when thumb is absent", () => {
    renderSelectedItemDetail({
      detailData: {
        title: "X",
        images: [{ uri: "https://example.com/from-images.jpg" }],
      } as DetailData,
      selectedItem: { id: "1", type: "release", title: "X" },
      albumArtReady: true,
    });
    expect(screen.getByRole("img")).toHaveAttribute("src", "https://example.com/from-images.jpg");
  });

  it("shows art placeholder while album art is not ready", () => {
    renderSelectedItemDetail({
      detailData: { title: "X", thumb: "https://example.com/cover.jpg" } as DetailData,
      selectedItem: { id: "1", type: "release", title: "X" },
      albumArtReady: false,
    });
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows No Image when there is no thumb or image uri", () => {
    renderSelectedItemDetail({
      detailData: { title: "X" } as DetailData,
      selectedItem: { id: "1", type: "release", title: "X" },
    });
    expect(screen.getByText("No Image")).toBeInTheDocument();
  });

  it("appends retry query when albumArtRetryKey is non-zero", () => {
    renderSelectedItemDetail({
      detailData: { title: "X", thumb: "https://example.com/cover.jpg" } as DetailData,
      selectedItem: { id: "1", type: "release", title: "X" },
      albumArtReady: true,
      albumArtRetryKey: 1,
    });
    expect(screen.getByRole("img")).toHaveAttribute("src", "https://example.com/cover.jpg?retry=1");
  });

  it("increments album art retry key on image error when below cap", () => {
    const setAlbumArtRetryKey = vi.fn();
    renderSelectedItemDetail({
      detailData: { title: "X", thumb: "https://example.com/cover.jpg" } as DetailData,
      selectedItem: { id: "1", type: "release", title: "X" },
      albumArtReady: true,
      albumArtRetryKey: 0,
      setAlbumArtRetryKey,
    });
    const img = screen.getByRole("img");
    fireEvent.error(img);
    expect(setAlbumArtRetryKey).toHaveBeenCalledWith(expect.any(Function));
    const updater = setAlbumArtRetryKey.mock.calls[0][0] as (k: number) => number;
    expect(updater(0)).toBe(1);
  });

  it("shows Manage Lists for release, master, and album types", () => {
    const types = ["release", "master", "album"] as const;
    for (const type of types) {
      const { unmount } = render(
        <DetailShellSliceContext.Provider
          value={buildDetailShellSliceValue({
            detailData: { title: "T" } as DetailData,
            selectedItem: { id: "1", type, title: "T" } as DetailItem,
          })}
        >
          <SelectedItemDetail />
        </DetailShellSliceContext.Provider>,
      );
      expect(screen.getByRole("button", { name: "Manage Lists" })).toBeInTheDocument();
      unmount();
    }
  });

  it("hides Manage Lists for artist selection", () => {
    renderSelectedItemDetail({
      detailData: { title: "T" } as DetailData,
      selectedItem: { id: "1", type: "artist", title: "T" },
    });
    expect(screen.queryByRole("button", { name: "Manage Lists" })).not.toBeInTheDocument();
  });

  it("calls handleAddToList when Manage Lists is clicked", () => {
    const handleAddToList = vi.fn();
    renderSelectedItemDetail({
      detailData: { title: "T" } as DetailData,
      selectedItem: { id: "1", type: "album", title: "T" },
      handleAddToList,
    });
    fireEvent.click(screen.getByRole("button", { name: "Manage Lists" }));
    expect(handleAddToList).toHaveBeenCalledTimes(1);
  });
});
