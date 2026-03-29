/** MusicDB `/api/search/*` URL builders (single place for path churn). */

const SEARCH_ROOT = "/api/search";

export function searchQueryUrl(
  API_BASE: string,
  params: URLSearchParams | Record<string, string> | string[][],
): string {
  const q = params instanceof URLSearchParams ? params : new URLSearchParams(params);
  return `${API_BASE}${SEARCH_ROOT}/?${q.toString()}`;
}

export function detailUrl(API_BASE: string, itemType: string, itemId: string): string {
  return `${API_BASE}${SEARCH_ROOT}/detail/?type=${encodeURIComponent(itemType)}&id=${encodeURIComponent(itemId)}`;
}

export function albumOverviewUrl(API_BASE: string, album: string, artist: string): string {
  return `${API_BASE}${SEARCH_ROOT}/album-overview/?album=${encodeURIComponent(album)}&artist=${encodeURIComponent(artist)}`;
}

export function listsIndexUrl(API_BASE: string, listType?: string | null): string {
  const base = `${API_BASE}${SEARCH_ROOT}/lists/`;
  if (listType == null || listType === "") return base;
  return `${base}?list_type=${encodeURIComponent(listType)}`;
}

export function listDetailUrl(API_BASE: string, listId: string | number): string {
  return `${API_BASE}${SEARCH_ROOT}/lists/${listId}/`;
}

export function listItemsCheckUrl(
  API_BASE: string,
  resourceType: string,
  resourceId: string,
): string {
  return `${API_BASE}${SEARCH_ROOT}/lists/items/check/?type=${encodeURIComponent(resourceType)}&id=${encodeURIComponent(resourceId)}`;
}

export function listItemsUrl(API_BASE: string): string {
  return `${API_BASE}${SEARCH_ROOT}/lists/items/`;
}

export function manualSpotifyMatchesUrl(API_BASE: string, releaseId: string | number): string {
  return `${API_BASE}${SEARCH_ROOT}/manual-spotify-matches/?release_id=${encodeURIComponent(releaseId)}`;
}

export function manualSpotifyMatchUrl(API_BASE: string): string {
  return `${API_BASE}${SEARCH_ROOT}/manual-spotify-match/`;
}

/** DELETE manual match — query params release_id and track_title */
export function manualSpotifyMatchDeleteUrl(
  API_BASE: string,
  releaseId: string | number,
  trackTitle: string,
): string {
  const params = new URLSearchParams({
    release_id: String(releaseId),
    track_title: trackTitle,
  });
  return `${API_BASE}${SEARCH_ROOT}/manual-spotify-match/?${params.toString()}`;
}

export function especiallyLikedTracksUrl(
  API_BASE: string,
  itemType: string,
  itemId: string,
): string {
  return `${API_BASE}${SEARCH_ROOT}/especially-liked-tracks/?item_type=${encodeURIComponent(itemType)}&item_id=${encodeURIComponent(itemId)}`;
}

export function especiallyLikedTrackUrl(API_BASE: string): string {
  return `${API_BASE}${SEARCH_ROOT}/especially-liked-track/`;
}
