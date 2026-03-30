import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { asAuthFetch, fakeFormEvent } from "../test/helpers";
import { useSearchSubmit } from "./useSearchSubmit";

describe("useSearchSubmit", () => {
  const API_BASE = "http://localhost:8000";

  function makeBase(overrides: Record<string, unknown> = {}) {
    return {
      API_BASE,
      authFetch: asAuthFetch(vi.fn()),
      query: "nirvana",
      searchType: "album",
      filterArtist: "Nirvana",
      filterYear: "1991",
      setLoading: vi.fn(),
      setError: vi.fn(),
      setResults: vi.fn(),
      setViewListId: vi.fn(),
      handleItemClick: vi.fn(),
      setSelectedItem: vi.fn(),
      setDetailData: vi.fn(),
      setSpotifyMatches: vi.fn(),
      ...overrides,
    };
  }

  it("no-ops on blank query", async () => {
    const deps = makeBase({ query: "  " });
    const { result } = renderHook(() => useSearchSubmit(deps));
    await result.current(fakeFormEvent());
    expect(deps.authFetch).not.toHaveBeenCalled();
    expect(deps.setLoading).not.toHaveBeenCalled();
  });

  it("search success sets results and opens first item", async () => {
    const first = { id: "1", type: "album", title: "Nevermind" };
    const deps = makeBase({
      authFetch: asAuthFetch(
        vi.fn(async () => ({
          ok: true,
          json: async () => ({ results: [first] }),
        })),
      ),
    });
    const raf = vi.fn((cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    vi.stubGlobal("requestAnimationFrame", raf);

    const { result } = renderHook(() => useSearchSubmit(deps));
    await result.current(fakeFormEvent());

    expect(deps.setLoading).toHaveBeenNthCalledWith(1, true);
    expect(deps.setError).toHaveBeenCalledWith(null);
    expect(deps.setResults).toHaveBeenCalledWith([first]);
    expect(deps.setViewListId).toHaveBeenCalledWith(null);
    expect(deps.handleItemClick).toHaveBeenCalledWith(first);
    expect(deps.setLoading).toHaveBeenLastCalledWith(false);
    vi.unstubAllGlobals();
  });

  it("empty results clear selected/detail/matches", async () => {
    const deps = makeBase({
      authFetch: asAuthFetch(
        vi.fn(async () => ({
          ok: true,
          json: async () => ({ results: [] }),
        })),
      ),
    });
    const { result } = renderHook(() => useSearchSubmit(deps));
    await result.current(fakeFormEvent());
    expect(deps.setSelectedItem).toHaveBeenCalledWith(null);
    expect(deps.setDetailData).toHaveBeenCalledWith(null);
    expect(deps.setSpotifyMatches).toHaveBeenCalledWith([]);
  });

  it("non-ok response sets server error", async () => {
    const deps = makeBase({
      authFetch: asAuthFetch(
        vi.fn(async () => ({
          ok: false,
          status: 500,
          json: async () => ({ error: "Boom" }),
        })),
      ),
    });
    const { result } = renderHook(() => useSearchSubmit(deps));
    await result.current(fakeFormEvent());
    expect(deps.setError).toHaveBeenCalledWith("Boom");
    expect(deps.setLoading).toHaveBeenLastCalledWith(false);
  });
});

