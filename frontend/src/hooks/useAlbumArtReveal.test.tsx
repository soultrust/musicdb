import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAlbumArtReveal } from "./useAlbumArtReveal";

describe("useAlbumArtReveal", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", (fn) => {
      fn();
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls setAlbumArtReady(true) after detail is loaded", () => {
    const setAlbumArtReady = vi.fn();
    renderHook(() => useAlbumArtReveal({ title: "Album" }, false, setAlbumArtReady));
    expect(setAlbumArtReady).toHaveBeenCalledTimes(1);
    expect(setAlbumArtReady).toHaveBeenCalledWith(true);
  });

  it("does nothing while detailLoading", () => {
    const setAlbumArtReady = vi.fn();
    renderHook(() => useAlbumArtReveal({ title: "Album" }, true, setAlbumArtReady));
    expect(setAlbumArtReady).not.toHaveBeenCalled();
  });

  it("does nothing without detailData", () => {
    const setAlbumArtReady = vi.fn();
    renderHook(() => useAlbumArtReveal(null, false, setAlbumArtReady));
    expect(setAlbumArtReady).not.toHaveBeenCalled();
  });

  it("cancels animation frame on unmount when reveal was scheduled", () => {
    const setAlbumArtReady = vi.fn();
    let rafId = 99;
    vi.stubGlobal("requestAnimationFrame", () => rafId);
    const { unmount } = renderHook(() =>
      useAlbumArtReveal({ title: "Album" }, false, setAlbumArtReady),
    );
    unmount();
    expect(globalThis.cancelAnimationFrame).toHaveBeenCalledWith(rafId);
  });
});
