import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { asAuthFetch } from "../../test/helpers";
import { useLibraryListsView } from "./useLibraryListsView";

function makeJsonResponse(body: unknown, ok = true) {
  return {
    ok,
    json: async () => body,
  };
}

describe("useLibraryListsView", () => {
  const API_BASE = "http://localhost:8000";

  it("loads lists index when accessToken is present", async () => {
    const authFetch = asAuthFetch(
      vi.fn(() =>
        Promise.resolve(makeJsonResponse({ lists: [{ id: 1, name: "A", list_type: "release" }] })),
      ),
    );
    const handleItemClick = vi.fn();

    const { result } = renderHook(() =>
      useLibraryListsView({
        API_BASE,
        accessToken: "jwt",
        authFetch,
        handleItemClick,
      }),
    );

    await waitFor(() => {
      expect(result.current.allListsForView).toHaveLength(1);
    });
    expect(authFetch).toHaveBeenCalledTimes(1);
  });

  it("clears lists when accessToken is removed", async () => {
    const authFetch = asAuthFetch(
      vi.fn(() =>
        Promise.resolve(makeJsonResponse({ lists: [{ id: 1, name: "A", list_type: "release" }] })),
      ),
    );
    const handleItemClick = vi.fn();

    const { result, rerender } = renderHook(
      (props: { accessToken: string | null }) =>
        useLibraryListsView({
          API_BASE,
          accessToken: props.accessToken,
          authFetch,
          handleItemClick,
        }),
      { initialProps: { accessToken: "jwt" as string | null } },
    );

    await waitFor(() => expect(result.current.allListsForView).toHaveLength(1));
    rerender({ accessToken: null });
    await waitFor(() => {
      expect(result.current.allListsForView).toEqual([]);
    });
  });

  it("loads list detail and auto-opens first item", async () => {
    const handleItemClick = vi.fn();
    const authFetch = asAuthFetch(vi.fn((url: string) => {
      if (url.includes("/lists/") && !url.includes("/lists/42/")) {
        return Promise.resolve(makeJsonResponse({ lists: [{ id: 42, name: "Favs", list_type: "release" }] }));
      }
      if (url.includes("/lists/42/")) {
        return Promise.resolve(
          makeJsonResponse({
            id: 42,
            items: [{ id: "rel-1", type: "release", title: "Paranoid" }],
          }),
        );
      }
      throw new Error(`Unexpected URL: ${url}`);
    }));

    const { result } = renderHook(() =>
      useLibraryListsView({
        API_BASE,
        accessToken: "jwt",
        authFetch,
        handleItemClick,
      }),
    );

    act(() => {
      result.current.setViewListId(42);
    });

    await waitFor(() => {
      expect(authFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/search/lists/42/"),
        expect.any(Object),
      );
    });
    await waitFor(() => {
      expect(handleItemClick).toHaveBeenCalledWith({
        id: "rel-1",
        type: "release",
        title: "Paranoid",
      });
    });
  });

  it('skips detail fetch for "spotify-playlists" sentinel', async () => {
    const authFetch = asAuthFetch(
      vi.fn((url: string) =>
        Promise.resolve(
          makeJsonResponse(
            url.includes("/lists/") && !url.includes("/lists/spotify-playlists/")
              ? { lists: [] }
              : { items: [{ id: "x", type: "release", title: "X" }] },
          ),
        ),
      ),
    );

    const { result } = renderHook(() =>
      useLibraryListsView({
        API_BASE,
        accessToken: "jwt",
        authFetch,
        handleItemClick: vi.fn(),
      }),
    );

    act(() => {
      result.current.setViewListId("spotify-playlists");
    });
    await waitFor(() => {
      expect(result.current.listViewData).toBeNull();
    });

    expect(authFetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/lists/spotify-playlists/"),
      expect.anything(),
    );
  });
});

