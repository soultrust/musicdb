import { especiallyLikedTrackUrl, especiallyLikedTracksUrl } from "./searchApi";

/** Authenticated fetch wrapper used across the app (string URLs only). */
export type AuthFetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export async function getEspeciallyLikedTracksApi({
  authFetch,
  API_BASE,
  itemType,
  itemId,
}: {
  authFetch: AuthFetchFn;
  API_BASE: string;
  itemType: string;
  itemId: string;
}): Promise<{ ok: boolean; data: { tracks?: unknown[] } & Record<string, unknown> }> {
  const res = await authFetch(especiallyLikedTracksUrl(API_BASE, itemType, itemId));
  const data = (await res.json()) as { tracks?: unknown[] } & Record<string, unknown>;
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
}: {
  authFetch: AuthFetchFn;
  API_BASE: string;
  itemType: string;
  itemId: string;
  trackTitle: string;
  trackPosition: string;
  especiallyLiked: boolean;
}): Promise<{ ok: boolean; data: Record<string, unknown> }> {
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
  const data = (await res.json()) as Record<string, unknown>;
  return { ok: res.ok, data };
}
