import type { Dispatch, FormEvent, SetStateAction } from "react";
import { useEffect, useRef, useState } from "react";
import { listItemsCheckUrl, listItemsUrl, listsIndexUrl } from "../../services/searchApi";
import type { AuthFetchFn } from "../../services/especiallyLikedApi";
import type { DetailData, DetailItem, ListForView } from "../../types/musicDbSlices";

type ListRow = { id: number; name: string; list_type?: string; [key: string]: unknown };

function listErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

/**
 * "Add to list" modal: opens for release / master / album items, fetches list index
 * (cached after first load), pre-selects lists that already contain the item, and handles
 * create-list plus batch add with `title` derived from `detailData` when available.
 */
export function useListModalActions({
  API_BASE,
  authFetch,
  accessToken,
  selectedItem,
  detailData,
  setAllListsForView,
}: {
  API_BASE: string;
  authFetch: AuthFetchFn;
  accessToken: string | null;
  selectedItem: DetailItem | null;
  detailData: DetailData | null;
  setAllListsForView: Dispatch<SetStateAction<ListForView[]>>;
}) {
  const [showListModal, setShowListModal] = useState(false);
  const [lists, setLists] = useState<ListRow[]>([]);
  const [selectedListIds, setSelectedListIds] = useState<number[]>([]);
  const [newListName, setNewListName] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const listModalItemRef = useRef<{ id: string | null; type: string | null }>({
    id: null,
    type: null,
  });
  const authFetchRef = useRef(authFetch);

  useEffect(() => {
    authFetchRef.current = authFetch;
  }, [authFetch]);

  useEffect(() => {
    if (!showListModal || !accessToken) return;
    setListLoading(true);
    setListError(null);
    const itemId = selectedItem?.id ?? null;
    const itemType = (selectedItem?.type ?? "").toLowerCase() || null;
    listModalItemRef.current = { id: itemId, type: itemType };

    const normalizedItemType = selectedItem ? (selectedItem.type || "").toLowerCase() : "";
    const shouldFetchListMembership =
      selectedItem &&
      (normalizedItemType === "release" ||
        normalizedItemType === "master" ||
        normalizedItemType === "album");
    const hasListsCache = lists.length > 0;

    const checkPromise = shouldFetchListMembership
      ? authFetchRef
          .current(listItemsCheckUrl(API_BASE, normalizedItemType, selectedItem.id))
          .then((res) => (res.ok ? res.json() : { list_ids: [] }))
          .then((d: { list_ids?: number[] }) => d.list_ids || [])
      : Promise.resolve<number[]>([]);

    const listType = "release";
    const listsPromise = hasListsCache
      ? Promise.resolve(lists)
      : authFetchRef
          .current(listsIndexUrl(API_BASE, listType))
          .then((res) => {
            if (!res.ok) {
              throw new Error(`HTTP ${res.status}`);
            }
            return res.json();
          })
          .then((data: { lists?: ListRow[] }) => data.lists || []);

    Promise.all([listsPromise, checkPromise])
      .then(([allLists, checkedIds]) => {
        const stillSameItem =
          listModalItemRef.current?.id === itemId && listModalItemRef.current?.type === itemType;
        if (!stillSameItem) return;
        if (!hasListsCache) setLists(allLists);
        setSelectedListIds(checkedIds);
      })
      .catch((err: unknown) => {
        setListError(listErrorMessage(err, "Failed to load lists"));
      })
      .finally(() => setListLoading(false));
  }, [showListModal, accessToken, selectedItem, API_BASE, lists]);

  function handleAddToList() {
    if (!selectedItem) return;
    const normalizedItemType = (selectedItem.type || "").toLowerCase();
    if (normalizedItemType !== "release" && normalizedItemType !== "master" && normalizedItemType !== "album")
      return;
    setShowListModal(true);
  }

  function handleCloseListModal() {
    setShowListModal(false);
    setSelectedListIds([]);
    setNewListName("");
    setListError(null);
  }

  function toggleListSelection(listId: number) {
    setSelectedListIds((prev) =>
      prev.includes(listId) ? prev.filter((id) => id !== listId) : [...prev, listId],
    );
  }

  async function handleCreateList(e?: FormEvent) {
    e?.preventDefault();
    const name = newListName.trim();
    if (!name) return;
    setListLoading(true);
    setListError(null);
    try {
      const res = await authFetch(listsIndexUrl(API_BASE), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, list_type: "release" }),
      });
      if (!res.ok) {
        const contentType = res.headers.get("content-type") || "";
        let errorMessage = `HTTP ${res.status}`;
        if (contentType.includes("application/json")) {
          try {
            const errorData = (await res.json()) as { error?: string; detail?: string };
            errorMessage = errorData.error || errorData.detail || errorMessage;
          } catch {
            // ignore
          }
        } else {
          errorMessage = `Failed to create list (${res.status})`;
        }
        throw new Error(errorMessage);
      }
      const data = (await res.json()) as ListRow;
      setLists((prev) => [data, ...prev]);
      setSelectedListIds((prev) => [...prev, data.id]);
      setNewListName("");
      setAllListsForView((prev) => [
        { id: data.id, list_type: data.list_type, name: data.name },
        ...prev,
      ]);
    } catch (err: unknown) {
      setListError(listErrorMessage(err, "Failed to create list"));
    } finally {
      setListLoading(false);
    }
  }

  async function handleAddToLists(_e?: FormEvent) {
    if (!selectedItem) return;
    const normalizedItemType = (selectedItem.type || "").toLowerCase();
    if (normalizedItemType !== "release" && normalizedItemType !== "master" && normalizedItemType !== "album")
      return;

    const titleToSave = (
      detailData?.artists?.length && detailData?.title
        ? `${detailData.artists.map((a) => a.name).join(", ")} - ${detailData.title}`
        : detailData?.title || selectedItem?.title || ""
    ).trim();

    setListLoading(true);
    setListError(null);
    try {
      const res = await authFetch(listItemsUrl(API_BASE), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: normalizedItemType,
          id: selectedItem.id,
          list_ids: selectedListIds,
          title: titleToSave,
        }),
      });
      if (!res.ok) {
        const contentType = res.headers.get("content-type") || "";
        let errorMessage = `HTTP ${res.status}`;
        if (contentType.includes("application/json")) {
          try {
            const errorData = (await res.json()) as { error?: string; detail?: string };
            errorMessage = errorData.error || errorData.detail || errorMessage;
          } catch {
            // ignore
          }
        } else {
          errorMessage = `Failed to update lists (${res.status})`;
        }
        throw new Error(errorMessage);
      }
      handleCloseListModal();
    } catch (err: unknown) {
      setListError(listErrorMessage(err, "Failed to update lists"));
    } finally {
      setListLoading(false);
    }
  }

  return {
    showListModal,
    setShowListModal,
    lists,
    selectedListIds,
    newListName,
    setNewListName,
    listLoading,
    listError,
    handleAddToList,
    handleCloseListModal,
    toggleListSelection,
    handleCreateList,
    handleAddToLists,
  };
}
