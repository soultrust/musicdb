import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildTrackKeyForItem, parseTrackKeyForEspeciallyLiked } from "../utils/trackKeys";
import {
  getEspeciallyLikedTracksApi,
  setEspeciallyLikedTrackApi,
} from "../services/especiallyLikedApi";
import {
  spotifyTracksContains,
  spotifySaveUserTrack,
  spotifyUnsaveUserTrack,
} from "../services/spotifyApi";

const LIKED_TRACKS_KEY = "soultrust_liked_tracks";
const ESPECIALLY_LIKED_BACKFILL_KEY = "soultrust_especially_liked_backfilled_v1";

/** localStorage / JSON may restore 0–2 as strings; keep display and Spotify sync consistent */
function normalizeStoredLikeValue(v) {
  if (v === 0 || v === 1 || v === 2) return v;
  if (v === "0" || v === "1" || v === "2") return Number(v);
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (n === 0 || n === 1 || n === 2) return n;
  }
  return null;
}

function normalizeLikedTracksMap(raw) {
  if (!raw || typeof raw !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const n = normalizeStoredLikeValue(v);
    if (n !== null) out[k] = n;
  }
  return out;
}

export function useLikedTracks({
  API_BASE,
  authFetch,
  accessToken,
  selectedItem,
  detailData,
  spotifyMatches,
  spotifyToken,
}) {
  const backfillInFlightRef = useRef(false);
  const [likedTracks, setLikedTracks] = useState(() => {
    try {
      const stored = localStorage.getItem(LIKED_TRACKS_KEY);
      const parsed = stored ? JSON.parse(stored) : {};
      return normalizeLikedTracksMap(parsed);
    } catch {
      return {};
    }
  });
  const [spotifySavedTrackIds, setSpotifySavedTrackIds] = useState(() => new Set());
  const [tracklistFilter, setTracklistFilter] = useState(null);

  useEffect(() => {
    if (!accessToken || backfillInFlightRef.current) return;

    try {
      if (localStorage.getItem(ESPECIALLY_LIKED_BACKFILL_KEY) === "true") return;
    } catch {
      // ignore read failure
    }

    backfillInFlightRef.current = true;
    (async () => {
      let ok = true;
      let storedLiked = {};
      try {
        storedLiked = JSON.parse(localStorage.getItem(LIKED_TRACKS_KEY) || "{}") || {};
      } catch {
        storedLiked = {};
      }

      const entries = Object.entries(storedLiked).filter(
        ([, v]) => normalizeStoredLikeValue(v) === 2,
      );
      if (entries.length === 0) {
        localStorage.setItem(ESPECIALLY_LIKED_BACKFILL_KEY, "true");
        return;
      }

      for (const [key] of entries) {
        const parsed = parseTrackKeyForEspeciallyLiked(key);
        if (!parsed) continue;
        try {
          const res = await setEspeciallyLikedTrackApi({
            authFetch,
            API_BASE,
            itemType: parsed.itemType,
            itemId: parsed.itemId,
            trackTitle: parsed.trackTitle,
            trackPosition: parsed.trackPosition,
            especiallyLiked: true,
          });
          if (!res.ok) ok = false;
        } catch {
          ok = false;
        }
      }

      if (ok) localStorage.setItem(ESPECIALLY_LIKED_BACKFILL_KEY, "true");
    })().finally(() => {
      backfillInFlightRef.current = false;
    });
  }, [API_BASE, accessToken, authFetch]);

  useEffect(() => {
    try {
      localStorage.setItem(LIKED_TRACKS_KEY, JSON.stringify(likedTracks));
    } catch {
      // ignore write failure
    }
  }, [likedTracks]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!spotifyToken || !spotifyMatches?.length) {
        if (!cancelled) setSpotifySavedTrackIds(new Set());
        return;
      }
      const ids = spotifyMatches.map((m) => m.spotify_track?.id).filter(Boolean);
      if (ids.length === 0) {
        if (!cancelled) setSpotifySavedTrackIds(new Set());
        return;
      }
      const BATCH = 50;
      const saved = new Set();
      for (let i = 0; i < ids.length; i += BATCH) {
        const chunk = ids.slice(i, i + BATCH);
        try {
          const res = await spotifyTracksContains(chunk, spotifyToken);
          if (!res.ok || cancelled) break;
          const arr = await res.json();
          chunk.forEach((id, idx) => {
            if (arr[idx]) saved.add(id);
          });
        } catch {
          break;
        }
      }
      if (!cancelled) setSpotifySavedTrackIds(new Set(saved));
    })();
    return () => {
      cancelled = true;
    };
  }, [spotifyToken, spotifyMatches]);

  useEffect(() => {
    function onFocus() {
      if (!spotifyToken || !spotifyMatches?.length) return;
      const ids = spotifyMatches.map((m) => m.spotify_track?.id).filter(Boolean);
      if (ids.length === 0) return;
      const BATCH = 50;
      const saved = new Set();
      const currentDetail = detailData;
      const currentSelected = selectedItem;

      (async () => {
        for (let i = 0; i < ids.length; i += BATCH) {
          const chunk = ids.slice(i, i + BATCH);
          try {
            const res = await spotifyTracksContains(chunk, spotifyToken);
            if (!res.ok) return;
            const arr = await res.json();
            chunk.forEach((id, idx) => {
              if (arr[idx]) saved.add(id);
            });
          } catch {
            return;
          }
        }

        setSpotifySavedTrackIds(new Set(saved));
        if (!currentDetail?.tracklist?.length) return;
        setLikedTracks((prev) => {
          let changed = false;
          const next = { ...prev };
          for (const track of currentDetail.tracklist) {
            const key = currentSelected ? buildTrackKeyForItem(currentSelected, track) : null;
            if (!key || normalizeStoredLikeValue(prev[key]) !== 1) continue;
            const match = spotifyMatches.find(
              (m) => (m.catalog_title ?? m.discogs_title) === track.title,
            );
            const sid = match?.spotify_track?.id;
            if (sid && !saved.has(sid)) {
              next[key] = 0;
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      })();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [detailData, selectedItem, spotifyMatches, spotifyToken]);

  const getTrackKey = useCallback(
    (track) => {
      if (!selectedItem || !detailData) return null;
      return buildTrackKeyForItem(selectedItem, track);
    },
    [detailData, selectedItem],
  );

  const getDisplayLikeState = useCallback(
    (track) => {
      const key = getTrackKey(track);
      if (!key) return 0;
      const hasLocal = Object.prototype.hasOwnProperty.call(likedTracks, key);
      const local = normalizeStoredLikeValue(likedTracks[key]);
      const match = spotifyMatches.find(
        (m) => (m.catalog_title ?? m.discogs_title) === track.title,
      );
      const spotifyId = match?.spotify_track?.id;
      const spotifySaved = spotifyId && spotifySavedTrackIds.has(spotifyId);
      if (hasLocal && local === 2) return 2;
      if (hasLocal && local === 1) return 1;
      if (hasLocal && local === 0) return 0;
      return spotifySaved ? 1 : 0;
    },
    [getTrackKey, likedTracks, spotifyMatches, spotifySavedTrackIds],
  );

  async function persistEspeciallyLikedTrack(track, nextState) {
    if (!selectedItem?.id || !selectedItem?.type) return;
    try {
      await setEspeciallyLikedTrackApi({
        authFetch,
        API_BASE,
        itemType: selectedItem.type,
        itemId: selectedItem.id,
        trackTitle: track?.title || "",
        trackPosition:
          track?.position != null && track?.position !== "" ? String(track.position) : "",
        especiallyLiked: nextState === 2,
      });
    } catch (err) {
      console.error("Failed to persist especially liked track:", err);
    }
  }

  function toggleLikeTrack(track) {
    const key = getTrackKey(track);
    if (!key) return;
    const match = spotifyMatches.find(
      (m) => (m.catalog_title ?? m.discogs_title) === track.title,
    );
    const spotifyTrack = match?.spotify_track;
    const displayState = getDisplayLikeState(track);
    const nextState = (displayState + 1) % 3;

    if (nextState === 0 && spotifyTrack?.id && spotifyToken) {
      spotifyUnsaveUserTrack(spotifyTrack.id, spotifyToken)
        .then(() => {
          setSpotifySavedTrackIds((prev) => {
            const next = new Set(prev);
            next.delete(spotifyTrack.id);
            return next;
          });
        })
        .catch((err) => console.error("Spotify unlike failed:", err));
    }

    if (nextState === 1 && spotifyTrack?.id && spotifyToken) {
      spotifySaveUserTrack(spotifyTrack.id, spotifyToken)
        .then(() => {
          setSpotifySavedTrackIds((prev) => new Set(prev).add(spotifyTrack.id));
        })
        .catch((err) => console.error("Spotify save track failed:", err));
    }

    setLikedTracks((prev) => ({ ...prev, [key]: nextState }));
    persistEspeciallyLikedTrack(track, nextState);
    if (nextState === 0 && tracklistFilter) setTracklistFilter(null);
  }

  const visibleTracklist = useMemo(() => {
    const list = detailData?.tracklist ?? [];
    if (!tracklistFilter) return list;
    return list.filter((track) => {
      const state = getDisplayLikeState(track);
      if (tracklistFilter === "liked") return state >= 1;
      if (tracklistFilter === "especially") return state === 2;
      return true;
    });
  }, [detailData?.tracklist, getDisplayLikeState, tracklistFilter]);

  function isTrackVisible(track) {
    if (!tracklistFilter) return true;
    const state = getDisplayLikeState(track);
    if (tracklistFilter === "liked") return state >= 1;
    if (tracklistFilter === "especially") return state === 2;
    return true;
  }

  async function syncEspeciallyLikedForItem(item, data) {
    if (
      !item?.id ||
      (item?.type !== "release" && item?.type !== "master" && item?.type !== "album") ||
      !data?.tracklist?.length
    ) {
      return;
    }
    try {
      const likesRes = await getEspeciallyLikedTracksApi({
        authFetch,
        API_BASE,
        itemType: item.type,
        itemId: item.id,
      });
      if (!likesRes.ok) return;
      const especiallySet = new Set(
        (likesRes.data.tracks || []).map(
          (t) => `${String(t.track_position || "")}::${String(t.track_title || "").trim()}`,
        ),
      );
      setLikedTracks((prev) => {
        const next = { ...prev };
        let changed = false;
        for (const track of data.tracklist) {
          const key = buildTrackKeyForItem(item, track);
          if (!key) continue;
          const fp = `${track.position != null && track.position !== "" ? String(track.position) : ""}::${String(track.title || "").trim()}`;
          const current = normalizeStoredLikeValue(next[key]);
          if (especiallySet.has(fp)) {
            if (current !== 2) {
              next[key] = 2;
              changed = true;
            }
          } else if (current === 2) {
            delete next[key];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    } catch (err) {
      console.error("Failed to load especially liked tracks:", err);
    }
  }

  return {
    getTrackKey,
    tracklistFilter,
    setTracklistFilter,
    getDisplayLikeState,
    toggleLikeTrack,
    visibleTracklist,
    isTrackVisible,
    syncEspeciallyLikedForItem,
  };
}
