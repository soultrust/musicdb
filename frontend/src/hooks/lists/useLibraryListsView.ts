import { useEffect, useRef, useState } from "react";
import { listDetailUrl, listsIndexUrl } from "../../services/searchApi";
import type { AuthFetchFn } from "../../services/especiallyLikedApi";
import type { ListForView, ListViewData, SearchResultItem } from "../../types/musicDbSlices";

/**
 * MusicDB "library lists" sidebar: fetches the list index for the header dropdown,
 * loads the selected list’s detail (items), and auto-opens the first item so the
 * detail panel stays in sync. Skips detail fetch when `viewListId` is the Spotify
 * playlists sentinel (`"spotify-playlists"`).
 */
export function useLibraryListsView({
  API_BASE,
  accessToken,
  authFetch,
  handleItemClick,
}: {
  API_BASE: string;
  accessToken: string | null;
  authFetch: AuthFetchFn;
  handleItemClick: (item: SearchResultItem) => void;
}) {
  const [allListsForView, setAllListsForView] = useState<ListForView[]>([]);
  const [viewListId, setViewListId] = useState<string | number | null>(null);
  const [listViewData, setListViewData] = useState<ListViewData | null>(null);
  const [listViewLoading, setListViewLoading] = useState(false);

  const authFetchRef = useRef(authFetch);
  const handleItemClickRef = useRef(handleItemClick);
  const fetchListsInFlightRef = useRef(false);

  useEffect(() => {
    authFetchRef.current = authFetch;
  }, [authFetch]);

  useEffect(() => {
    handleItemClickRef.current = handleItemClick;
  }, [handleItemClick]);

  useEffect(() => {
    if (!accessToken) {
      const id = setTimeout(() => setAllListsForView([]), 0);
      return () => clearTimeout(id);
    }
    let cancelled = false;
    if (fetchListsInFlightRef.current) {
      return;
    }
    fetchListsInFlightRef.current = true;

    authFetchRef
      .current(listsIndexUrl(API_BASE), {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      .then((res) => (res.ok ? res.json() : { lists: [] }))
      .then((data: { lists?: ListForView[] }) => {
        if (!cancelled) setAllListsForView(data.lists || []);
      })
      .catch(() => {
        if (!cancelled) setAllListsForView([]);
      })
      .finally(() => {
        fetchListsInFlightRef.current = false;
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, API_BASE]);

  useEffect(() => {
    if (!viewListId || !accessToken) {
      const id = setTimeout(() => setListViewData(null), 0);
      return () => clearTimeout(id);
    }
    if (viewListId === "spotify-playlists") return;
    /* eslint-disable react-hooks/set-state-in-effect -- intentional sync before starting fetch */
    setListViewLoading(true);
    setListViewData(null);
    /* eslint-enable react-hooks/set-state-in-effect */
    let cancelled = false;
    authFetchRef
      .current(listDetailUrl(API_BASE, viewListId), {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data: ListViewData | null) => {
        if (!cancelled && data) setListViewData(data);
      })
      .finally(() => {
        if (!cancelled) setListViewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewListId, accessToken, API_BASE]);

  useEffect(() => {
    const items = listViewData?.items;
    if (!viewListId || !items?.length) return;
    const firstItem = items[0];
    const item: SearchResultItem = { id: firstItem.id, type: firstItem.type, title: firstItem.title };
    const timeoutId = setTimeout(() => {
      handleItemClickRef.current(item);
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [viewListId, listViewData]);

  return {
    allListsForView,
    setAllListsForView,
    viewListId,
    setViewListId,
    listViewData,
    setListViewData,
    listViewLoading,
  };
}
