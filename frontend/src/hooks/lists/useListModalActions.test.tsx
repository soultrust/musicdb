import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { asAuthFetch, fakeFormEvent } from "../../test/helpers";
import { useListModalActions } from "./useListModalActions";

function makeJsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    headers: { get: () => "application/json" },
    json: async () => body,
  };
}

describe("useListModalActions", () => {
  const API_BASE = "http://localhost:8000";

  it("opens modal only for release/master/album", () => {
    const authFetch = asAuthFetch(vi.fn((url: string) => {
      if (url.includes("/lists/items/check/")) return Promise.resolve(makeJsonResponse({ list_ids: [] }));
      if (url.includes("/lists/")) return Promise.resolve(makeJsonResponse({ lists: [] }));
      throw new Error(`Unexpected URL: ${url}`);
    }));
    const { result, rerender } = renderHook(
      (props) =>
        useListModalActions({
          API_BASE,
          authFetch,
          accessToken: "jwt",
          selectedItem: props.selectedItem,
          detailData: null,
          setAllListsForView: vi.fn(),
        }),
      { initialProps: { selectedItem: { id: "1", type: "artist", title: "Artist" } } },
    );

    act(() => result.current.handleAddToList());
    expect(result.current.showListModal).toBe(false);

    rerender({ selectedItem: { id: "2", type: "album", title: "Album" } });
    act(() => result.current.handleAddToList());
    expect(result.current.showListModal).toBe(true);
  });

  it("loads lists and existing membership when modal opens", async () => {
    const authFetch = asAuthFetch(vi.fn((url: string) => {
      if (url.includes("/lists/items/check/")) return Promise.resolve(makeJsonResponse({ list_ids: [1] }));
      if (url.includes("/lists/")) return Promise.resolve(makeJsonResponse({ lists: [{ id: 1, name: "Favs", list_type: "release" }] }));
      throw new Error(`Unexpected URL: ${url}`);
    }));

    const { result } = renderHook(() =>
      useListModalActions({
        API_BASE,
        authFetch,
        accessToken: "jwt",
        selectedItem: { id: "abc", type: "release", title: "A" },
        detailData: null,
        setAllListsForView: vi.fn(),
      }),
    );

    act(() => result.current.handleAddToList());

    await waitFor(() => {
      expect(result.current.lists).toHaveLength(1);
      expect(result.current.selectedListIds).toEqual([1]);
      expect(result.current.listLoading).toBe(false);
    });
  });

  it("creates a new list and updates selected IDs + dropdown source", async () => {
    const setAllListsForView = vi.fn();
    const authFetch = asAuthFetch(
      vi.fn((url: string, options?: RequestInit) => {
        if (options?.method === "POST" && url.includes("/lists/")) {
          return Promise.resolve(
            makeJsonResponse({ id: 99, name: "Roadtrip", list_type: "release" }),
          );
        }
        if (url.includes("/lists/items/check/")) return Promise.resolve(makeJsonResponse({ list_ids: [] }));
        if (url.includes("/lists/")) return Promise.resolve(makeJsonResponse({ lists: [] }));
        throw new Error(`Unexpected URL: ${url}`);
      }),
    );

    const { result } = renderHook(() =>
      useListModalActions({
        API_BASE,
        authFetch,
        accessToken: "jwt",
        selectedItem: { id: "abc", type: "album", title: "A" },
        detailData: null,
        setAllListsForView,
      }),
    );

    act(() => {
      result.current.setNewListName(" Roadtrip ");
    });

    await act(async () => {
      await result.current.handleCreateList(fakeFormEvent());
    });

    expect(result.current.lists[0].id).toBe(99);
    expect(result.current.selectedListIds).toContain(99);
    expect(result.current.newListName).toBe("");
    expect(setAllListsForView).toHaveBeenCalledTimes(1);
  });

  it("posts selected list IDs with artist-prefixed title and closes modal", async () => {
    const authFetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (options?.method === "POST" && url.includes("/lists/items/")) {
        return Promise.resolve(makeJsonResponse({ ok: true }));
      }
      if (url.includes("/lists/items/check/")) return Promise.resolve(makeJsonResponse({ list_ids: [1, 2] }));
      if (url.includes("/lists/")) return Promise.resolve(makeJsonResponse({ lists: [{ id: 1 }, { id: 2 }] }));
      throw new Error(`Unexpected URL: ${url}`);
    });
    const authFetch = asAuthFetch(authFetchMock);

    const { result } = renderHook(() =>
      useListModalActions({
        API_BASE,
        authFetch,
        accessToken: "jwt",
        selectedItem: { id: "rel-1", type: "release", title: "Fallback Title" },
        detailData: { title: "Paranoid", artists: [{ name: "Black Sabbath" }] },
        setAllListsForView: vi.fn(),
      }),
    );

    act(() => result.current.handleAddToList());
    await waitFor(() => expect(result.current.selectedListIds).toEqual([1, 2]));

    await act(async () => {
      await result.current.handleAddToLists();
    });

    const postCall = authFetchMock.mock.calls.find(
      ([url, options]) => url.includes("/lists/items/") && options?.method === "POST",
    );
    expect(postCall).toBeDefined();
    if (!postCall) throw new Error("expected POST to /lists/items/");
    const options = postCall[1];
    if (options?.body == null) throw new Error("expected JSON body");
    const payload = JSON.parse(String(options.body));
    expect(payload).toEqual({
      type: "release",
      id: "rel-1",
      list_ids: [1, 2],
      title: "Black Sabbath - Paranoid",
    });
    expect(result.current.showListModal).toBe(false);
  });

  it("removes the item from the viewed list sidebar after unchecking that list", async () => {
    const setListViewData = vi.fn();
    const authFetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (options?.method === "POST" && url.includes("/lists/items/")) {
        return Promise.resolve(makeJsonResponse({ ok: true }));
      }
      if (url.includes("/lists/items/check/")) return Promise.resolve(makeJsonResponse({ list_ids: [42] }));
      if (url.includes("/lists/")) {
        return Promise.resolve(makeJsonResponse({ lists: [{ id: 42, name: "Favs", list_type: "release" }] }));
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const { result } = renderHook(() =>
      useListModalActions({
        API_BASE,
        authFetch: asAuthFetch(authFetchMock),
        accessToken: "jwt",
        selectedItem: { id: "rel-1", type: "album", title: "Paranoid" },
        detailData: { title: "Paranoid" },
        setAllListsForView: vi.fn(),
        viewListId: 42,
        setListViewData,
      }),
    );

    act(() => result.current.handleAddToList());
    await waitFor(() => expect(result.current.selectedListIds).toEqual([42]));

    act(() => result.current.toggleListSelection(42));
    expect(result.current.selectedListIds).toEqual([]);

    await act(async () => {
      await result.current.handleAddToLists();
    });

    expect(setListViewData).toHaveBeenCalledTimes(1);
    const updater = setListViewData.mock.calls[0][0] as (prev: {
      name: string;
      items: Array<{ id: string; type: string; title: string }>;
    }) => unknown;
    const next = updater({
      name: "Favs",
      items: [
        { id: "rel-1", type: "album", title: "Paranoid" },
        { id: "rel-2", type: "album", title: "Master of Reality" },
      ],
    });
    expect(next).toEqual({
      name: "Favs",
      items: [{ id: "rel-2", type: "album", title: "Master of Reality" }],
    });
  });

  it("adds the item to the viewed list sidebar when that list is newly checked", async () => {
    const setListViewData = vi.fn();
    const authFetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (options?.method === "POST" && url.includes("/lists/items/")) {
        return Promise.resolve(makeJsonResponse({ ok: true }));
      }
      if (url.includes("/lists/items/check/")) return Promise.resolve(makeJsonResponse({ list_ids: [] }));
      if (url.includes("/lists/")) {
        return Promise.resolve(makeJsonResponse({ lists: [{ id: 42, name: "Favs", list_type: "release" }] }));
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const { result } = renderHook(() =>
      useListModalActions({
        API_BASE,
        authFetch: asAuthFetch(authFetchMock),
        accessToken: "jwt",
        selectedItem: { id: "rel-9", type: "album", title: "Vol. 4" },
        detailData: { title: "Vol. 4", artists: [{ name: "Black Sabbath" }] },
        setAllListsForView: vi.fn(),
        viewListId: 42,
        setListViewData,
      }),
    );

    act(() => result.current.handleAddToList());
    await waitFor(() => expect(result.current.listLoading).toBe(false));

    act(() => result.current.toggleListSelection(42));
    await act(async () => {
      await result.current.handleAddToLists();
    });

    expect(setListViewData).toHaveBeenCalledTimes(1);
    const updater = setListViewData.mock.calls[0][0] as (prev: {
      name: string;
      items: Array<{ id: string; type: string; title: string }>;
    }) => unknown;
    const next = updater({
      name: "Favs",
      items: [{ id: "rel-1", type: "album", title: "Paranoid" }],
    });
    expect(next).toEqual({
      name: "Favs",
      items: [
        { id: "rel-1", type: "album", title: "Paranoid" },
        { id: "rel-9", type: "album", title: "Black Sabbath - Vol. 4" },
      ],
    });
  });
});

