import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useListModalActions } from "./useListModalActions";

function makeJsonResponse(body, ok = true, status = 200) {
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
    const authFetch = vi.fn((url) => {
      if (url.includes("/lists/items/check/")) return Promise.resolve(makeJsonResponse({ list_ids: [] }));
      if (url.includes("/lists/")) return Promise.resolve(makeJsonResponse({ lists: [] }));
      throw new Error(`Unexpected URL: ${url}`);
    });
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
    const authFetch = vi.fn((url) => {
      if (url.includes("/lists/items/check/")) return Promise.resolve(makeJsonResponse({ list_ids: [1] }));
      if (url.includes("/lists/")) return Promise.resolve(makeJsonResponse({ lists: [{ id: 1, name: "Favs", list_type: "release" }] }));
      throw new Error(`Unexpected URL: ${url}`);
    });

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
    const authFetch = vi.fn((url, options) => {
      if (options?.method === "POST" && url.includes("/lists/")) {
        return Promise.resolve(
          makeJsonResponse({ id: 99, name: "Roadtrip", list_type: "release" }),
        );
      }
      if (url.includes("/lists/items/check/")) return Promise.resolve(makeJsonResponse({ list_ids: [] }));
      if (url.includes("/lists/")) return Promise.resolve(makeJsonResponse({ lists: [] }));
      throw new Error(`Unexpected URL: ${url}`);
    });

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
      await result.current.handleCreateList({ preventDefault() {} });
    });

    expect(result.current.lists[0].id).toBe(99);
    expect(result.current.selectedListIds).toContain(99);
    expect(result.current.newListName).toBe("");
    expect(setAllListsForView).toHaveBeenCalledTimes(1);
  });

  it("posts selected list IDs with artist-prefixed title and closes modal", async () => {
    const authFetch = vi.fn((url, options) => {
      if (options?.method === "POST" && url.includes("/lists/items/")) {
        return Promise.resolve(makeJsonResponse({ ok: true }));
      }
      if (url.includes("/lists/items/check/")) return Promise.resolve(makeJsonResponse({ list_ids: [1, 2] }));
      if (url.includes("/lists/")) return Promise.resolve(makeJsonResponse({ lists: [{ id: 1 }, { id: 2 }] }));
      throw new Error(`Unexpected URL: ${url}`);
    });

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

    const postCall = authFetch.mock.calls.find(
      ([url, options]) => url.includes("/lists/items/") && options?.method === "POST",
    );
    expect(postCall).toBeTruthy();
    const payload = JSON.parse(postCall[1].body);
    expect(payload).toEqual({
      type: "release",
      id: "rel-1",
      list_ids: [1, 2],
      title: "Black Sabbath - Paranoid",
    });
    expect(result.current.showListModal).toBe(false);
  });
});

