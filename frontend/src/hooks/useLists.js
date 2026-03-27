import { useEffect, useRef, useState } from "react";
import {
  listDetailUrl,
  listItemsCheckUrl,
  listItemsUrl,
  listsIndexUrl,
} from "../services/searchApi";

export function useLists({
  API_BASE,
  authFetch,
  accessToken,
  spotifyToken,
  selectedItem,
  detailData,
  handleItemClick,
}) {
  const [showListModal, setShowListModal] = useState(false);
  const [lists, setLists] = useState([]);
  const [selectedListIds, setSelectedListIds] = useState([]);
  const [newListName, setNewListName] = useState("");
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState(null);
  const listModalItemRef = useRef({ id: null, type: null });

  const [allListsForView, setAllListsForView] = useState([]);
  const [viewListId, setViewListId] = useState(null);
  const [listViewData, setListViewData] = useState(null);
  const [listViewLoading, setListViewLoading] = useState(false);

  const [spotifyPlaylists, setSpotifyPlaylists] = useState([]);
  const [spotifyPlaylistsLoading, setSpotifyPlaylistsLoading] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [playlistTracksData, setPlaylistTracksData] = useState(null);
  const [playlistTracksLoading, setPlaylistTracksLoading] = useState(false);
  const handleItemClickRef = useRef(handleItemClick);
  const authFetchRef = useRef(authFetch);
  const fetchListsInFlightRef = useRef(false);

  // Keep a stable ref so effects don't re-run when `handleItemClick` identity changes
  useEffect(() => {
    handleItemClickRef.current = handleItemClick;
  }, [handleItemClick]);

  useEffect(() => {
    authFetchRef.current = authFetch;
  }, [authFetch]);

  useEffect(() => {
    if (!accessToken) {
      setAllListsForView([]);
      return;
    }
    let cancelled = false;
    if (fetchListsInFlightRef.current) return;
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
      setListViewData(null);
      return;
    }
    if (viewListId === "spotify-playlists") return;
    setListViewLoading(true);
    setListViewData(null);
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
      cancelled = true;
    };
  }, [viewListId, accessToken, API_BASE]);

  useEffect(() => {
    if (viewListId !== "spotify-playlists" || !spotifyToken || !accessToken) {
      setSpotifyPlaylists([]);
      setSelectedPlaylistId(null);
      setPlaylistTracksData(null);
      return;
    }
    setSpotifyPlaylistsLoading(true);
    let cancelled = false;
    authFetchRef.current(`${API_BASE}/api/spotify/playlists/`, {
      headers: { Authorization: `Bearer ${spotifyToken}` },
    })
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (!cancelled && data) setSpotifyPlaylists(data.playlists || []);
      })
      .catch((err) => {
        console.error("Failed to fetch Spotify playlists:", err);
      })
      .finally(() => {
        if (!cancelled) setSpotifyPlaylistsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewListId, spotifyToken, accessToken, API_BASE]);

  useEffect(() => {
    if (!selectedPlaylistId || !spotifyToken || !accessToken || viewListId !== "spotify-playlists") {
      setPlaylistTracksData(null);
      return;
    }
    setPlaylistTracksLoading(true);
    let cancelled = false;
    authFetchRef.current(`${API_BASE}/api/spotify/playlists/${selectedPlaylistId}/tracks/`, {
      headers: { Authorization: `Bearer ${spotifyToken}` },
    })
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (!cancelled && data) setPlaylistTracksData(data);
      })
      .catch((err) => {
        console.error("Failed to fetch playlist tracks:", err);
      })
      .finally(() => {
        if (!cancelled) setPlaylistTracksLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedPlaylistId, spotifyToken, accessToken, viewListId, API_BASE]);

  useEffect(() => {
    const items = listViewData?.items;
    if (!viewListId || !items?.length) return;
    const first = items[0];
    const item = { id: first.id, type: first.type, title: first.title };
    const id = requestAnimationFrame(() => {
      handleItemClickRef.current(item);
    });
    return () => cancelAnimationFrame(id);
  }, [viewListId, listViewData]);

  useEffect(() => {
    if (!showListModal || !accessToken) return;
    setListLoading(true);
    setListError(null);
    const itemId = selectedItem?.id ?? null;
    const itemType = (selectedItem?.type ?? "").toLowerCase() || null;
    listModalItemRef.current = { id: itemId, type: itemType };

    const t = selectedItem ? (selectedItem.type || "").toLowerCase() : "";
    const needCheck = selectedItem && (t === "release" || t === "master" || t === "album");
    const haveListsCached = lists.length > 0;

    const checkPromise = needCheck
      ? authFetchRef.current(listItemsCheckUrl(API_BASE, t, selectedItem.id))
          .then((res) => (res.ok ? res.json() : { list_ids: [] }))
          .then((d) => d.list_ids || [])
      : Promise.resolve([]);

    const listType = "release";
    const listsPromise = haveListsCached
      ? Promise.resolve(lists)
      : authFetchRef.current(listsIndexUrl(API_BASE, listType))
          .then((res) => {
            if (!res.ok) {
              throw new Error(`HTTP ${res.status}`);
            }
            return res.json();
          })
          .then((data) => data.lists || []);

    Promise.all([listsPromise, checkPromise])
      .then(([allLists, checkedIds]) => {
        const stillSameItem =
          listModalItemRef.current?.id === itemId && listModalItemRef.current?.type === itemType;
        if (!stillSameItem) return;
        if (!haveListsCached) setLists(allLists);
        setSelectedListIds(checkedIds);
      })
      .catch((err) => {
        setListError(err.message || "Failed to load lists");
      })
      .finally(() => setListLoading(false));
  }, [showListModal, accessToken, selectedItem, API_BASE, lists]);

  function handleAddToList() {
    if (!selectedItem) return;
    const t = (selectedItem.type || "").toLowerCase();
    if (t !== "release" && t !== "master" && t !== "album") return;
    setShowListModal(true);
  }

  function handleCloseListModal() {
    setShowListModal(false);
    setSelectedListIds([]);
    setNewListName("");
    setListError(null);
  }

  function toggleListSelection(listId) {
    setSelectedListIds((prev) => (prev.includes(listId) ? prev.filter((id) => id !== listId) : [...prev, listId]));
  }

  async function handleCreateList(e) {
    e.preventDefault();
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
            const errorData = await res.json();
            errorMessage = errorData.error || errorData.detail || errorMessage;
          } catch {
            // ignore
          }
        } else {
          errorMessage = `Failed to create list (${res.status})`;
        }
        throw new Error(errorMessage);
      }
      const data = await res.json();
      setLists((prev) => [data, ...prev]);
      setSelectedListIds((prev) => [...prev, data.id]);
      setNewListName("");
      setAllListsForView((prev) => [{ id: data.id, list_type: data.list_type, name: data.name }, ...prev]);
    } catch (err) {
      setListError(err.message || "Failed to create list");
    } finally {
      setListLoading(false);
    }
  }

  async function handleAddToLists() {
    if (!selectedItem) return;
    const t = (selectedItem.type || "").toLowerCase();
    if (t !== "release" && t !== "master" && t !== "album") return;

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
          type: t,
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
            const errorData = await res.json();
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
    } catch (err) {
      setListError(err.message || "Failed to update lists");
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
    allListsForView,
    viewListId,
    setViewListId,
    listViewData,
    setListViewData,
    listViewLoading,
    spotifyPlaylists,
    spotifyPlaylistsLoading,
    selectedPlaylistId,
    setSelectedPlaylistId,
    playlistTracksData,
    setPlaylistTracksData,
    playlistTracksLoading,
    handleAddToList,
    handleCloseListModal,
    toggleListSelection,
    handleCreateList,
    handleAddToLists,
  };
}

