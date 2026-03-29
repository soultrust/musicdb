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

