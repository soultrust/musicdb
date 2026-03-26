export async function getEspeciallyLikedTracksApi({
  authFetch,
  API_BASE,
  itemType,
  itemId,
}) {
  const res = await authFetch(
    `${API_BASE}/api/search/especially-liked-tracks/?item_type=${encodeURIComponent(
      itemType,
    )}&item_id=${encodeURIComponent(itemId)}`,
  );
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
  const res = await authFetch(`${API_BASE}/api/search/especially-liked-track/`, {
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

