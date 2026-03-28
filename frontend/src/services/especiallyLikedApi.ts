import { especiallyLikedTrackUrl, especiallyLikedTracksUrl } from "./searchApi";

export async function getEspeciallyLikedTracksApi({
  authFetch,
  API_BASE,
  itemType,
  itemId,
}) {
  const res = await authFetch(especiallyLikedTracksUrl(API_BASE, itemType, itemId));
  const data = await res.json();
  return { ok: res.ok, data };
}

export async function setEspeciallyLikedTrackApi({
  authFetch,
  API_BASE,
  itemType,
  itemId,
  trackTitle,
  trackPosition,
  especiallyLiked,
}) {
  const res = await authFetch(especiallyLikedTrackUrl(API_BASE), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      item_type: itemType,
      item_id: itemId,
      track_title: trackTitle || "",
      track_position: trackPosition || "",
      especially_liked: especiallyLiked,
    }),
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

