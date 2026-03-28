import { useEffect, useRef, useState } from "react";
import { listDetailUrl, listsIndexUrl } from "../../services/searchApi";

/**
 * MusicDB "library lists" sidebar: fetches the list index for the header dropdown,
 * loads the selected list’s detail (items), and auto-opens the first item so the
 * detail panel stays in sync. Skips detail fetch when `viewListId` is the Spotify
 * playlists sentinel (`"spotify-playlists"`).
 *
 * @param {object} args
 * @param {string} args.API_BASE MusicDB API origin
 * @param {string|null} args.accessToken JWT for MusicDB
 * @param {function} args.authFetch fetch wrapper (cookies / auth)
 * @param {function} args.handleItemClick Opens a row in the main UI (id, type, title)
 */
export function useLibraryListsView({
  API_BASE,
  accessToken,
  authFetch,
  handleItemClick,
}) {
  const [allListsForView, setAllListsForView] = useState([]);
  const [viewListId, setViewListId] = useState(null);
  const [listViewData, setListViewData] = useState(null);
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

    authFetchRef.current(listsIndexUrl(API_BASE), {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => (res.ok ? res.json() : { lists: [] }))
      .then((data) => {
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
    const startId = setTimeout(() => {
      setListViewLoading(true);
      setListViewData(null);
    }, 0);
    let cancelled = false;
    authFetchRef.current(listDetailUrl(API_BASE, viewListId), {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (!cancelled && data) setListViewData(data);
      })
      .finally(() => {
        if (!cancelled) setListViewLoading(false);
      });
    return () => {
      clearTimeout(startId);
      cancelled = true;
    };
  }, [viewListId, accessToken, API_BASE]);

  useEffect(() => {
    const items = listViewData?.items;
    if (!viewListId || !items?.length) return;
    const firstItem = items[0];
    const item = { id: firstItem.id, type: firstItem.type, title: firstItem.title };
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) handleItemClickRef.current(item);
    });
    return () => {
      cancelled = true;
    };
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
