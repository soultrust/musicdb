import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useViewSwitchReset } from "./useViewSwitchReset";

function makeSetters() {
  return {
    setViewListId: vi.fn(),
    setListViewData: vi.fn(),
    setSelectedItem: vi.fn(),
    setDetailData: vi.fn(),
    setSelectedPlaylistId: vi.fn(),
    setPlaylistTracksData: vi.fn(),
  };
}

describe("useViewSwitchReset", () => {
  it("clears all view state when selecting empty value", () => {
    const setters = makeSetters();
    const { result } = renderHook(() => useViewSwitchReset(setters));
    result.current({ target: { value: "" } });

    expect(setters.setViewListId).toHaveBeenCalledWith(null);
    expect(setters.setListViewData).toHaveBeenCalledWith(null);
    expect(setters.setSelectedItem).toHaveBeenCalledWith(null);
    expect(setters.setDetailData).toHaveBeenCalledWith(null);
    expect(setters.setSelectedPlaylistId).toHaveBeenCalledWith(null);
    expect(setters.setPlaylistTracksData).toHaveBeenCalledWith(null);
  });

  it("switches to spotify-playlists sentinel and clears detail state", () => {
    const setters = makeSetters();
    const { result } = renderHook(() => useViewSwitchReset(setters));
    result.current({ target: { value: "spotify-playlists" } });

    expect(setters.setViewListId).toHaveBeenCalledWith("spotify-playlists");
    expect(setters.setListViewData).toHaveBeenCalledWith(null);
    expect(setters.setSelectedItem).toHaveBeenCalledWith(null);
    expect(setters.setDetailData).toHaveBeenCalledWith(null);
    expect(setters.setSelectedPlaylistId).toHaveBeenCalledWith(null);
    expect(setters.setPlaylistTracksData).toHaveBeenCalledWith(null);
  });

  it("parses numeric list ID and resets selected/detail/playlist state", () => {
    const setters = makeSetters();
    const { result } = renderHook(() => useViewSwitchReset(setters));
    result.current({ target: { value: "42" } });

    expect(setters.setViewListId).toHaveBeenCalledWith(42);
    expect(setters.setSelectedItem).toHaveBeenCalledWith(null);
    expect(setters.setDetailData).toHaveBeenCalledWith(null);
    expect(setters.setSelectedPlaylistId).toHaveBeenCalledWith(null);
    expect(setters.setPlaylistTracksData).toHaveBeenCalledWith(null);
  });
});

