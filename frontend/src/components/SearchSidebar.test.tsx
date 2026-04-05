import type { ChangeEvent } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mockSearchSidebarContext = vi.fn();

vi.mock("../hooks/useMusicDbApp", () => ({
  useSearchSidebarContext: () => mockSearchSidebarContext(),
}));

import SearchSidebar from "./SearchSidebar";

function baseCtx() {
  return {
    handleSubmit: vi.fn((e) => e.preventDefault()),
    searchType: "album",
    setSearchType: vi.fn(),
    query: "",
    setQuery: vi.fn(),
    loading: false,
    viewListId: null,
    filterArtist: "",
    setFilterArtist: vi.fn(),
    filterYear: "",
    setFilterYear: vi.fn(),
    filterYearFrom: "",
    setFilterYearFrom: vi.fn(),
    filterYearTo: "",
    setFilterYearTo: vi.fn(),
    allowDigitsOnly:
      (setter: (v: string) => void) => (e: ChangeEvent<HTMLInputElement>) =>
        setter(e.target.value.replace(/\D/g, "").slice(0, 4)),
    error: null,
    spotifyPlaylistsLoading: false,
    spotifyToken: null,
    spotifyPlaylists: [],
    selectedPlaylistId: null,
    setSelectedPlaylistId: vi.fn(),
    setSelectedItem: vi.fn(),
    setDetailData: vi.fn(),
    listViewData: null,
    listViewLoading: false,
    handleItemClick: vi.fn(),
    results: [{ id: "a1", type: "album", title: "Album One" }],
    selectedItem: null,
    detailLoading: false,
    detailData: null,
  };
}

describe("SearchSidebar", () => {
  it("renders search controls and wires interactions", () => {
    const ctx = baseCtx();
    mockSearchSidebarContext.mockReturnValue(ctx);
    render(<SearchSidebar />);

    fireEvent.change(screen.getByLabelText("Search type"), { target: { value: "song" } });
    expect(ctx.setSearchType).toHaveBeenCalledWith("song");

    fireEvent.change(screen.getByPlaceholderText("Search albums…"), { target: { value: "Paranoid" } });
    expect(ctx.setQuery).toHaveBeenCalledWith("Paranoid");

    fireEvent.click(screen.getByText("Album One"));
    expect(ctx.handleItemClick).toHaveBeenCalledWith({ id: "a1", type: "album", title: "Album One" });
  });

  it("shows artist albums in the sidebar when an artist is selected", () => {
    const ctx = {
      ...baseCtx(),
      selectedItem: { id: "art-1", type: "artist", title: "The Band" },
      detailLoading: false,
      detailData: {
        title: "The Band",
        albums: [
          { id: "rel-1", title: "Music from Big Pink", year: "1968" },
          { id: "rel-2", title: "The Band", year: "1969" },
        ],
      },
    };
    mockSearchSidebarContext.mockReturnValue(ctx);
    render(<SearchSidebar />);

    expect(screen.getByText(/Albums — The Band/)).toBeInTheDocument();
    expect(screen.getByText(/1968 — Music from Big Pink/)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/1969 — The Band/));
    expect(ctx.handleItemClick).toHaveBeenCalledWith({
      id: "rel-2",
      type: "album",
      title: "The Band",
    });
  });

  it("renders spotify playlists branch and selects playlist", () => {
    const ctx = {
      ...baseCtx(),
      viewListId: "spotify-playlists",
      spotifyToken: "sp",
      spotifyPlaylists: [{ id: "p1", name: "Road Trip", owner: "me" }],
    };
    mockSearchSidebarContext.mockReturnValue(ctx);
    render(<SearchSidebar />);

    fireEvent.click(screen.getByText("Road Trip"));
    expect(ctx.setSelectedPlaylistId).toHaveBeenCalledWith("p1");
    expect(ctx.setSelectedItem).toHaveBeenCalledWith(null);
    expect(ctx.setDetailData).toHaveBeenCalledWith(null);
  });
});

