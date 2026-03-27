/** MusicDB `/api/search/*` URL builders (single place for path churn). */

const SEARCH_ROOT = "/api/search";

export function searchQueryUrl(API_BASE, params) {
  const q = params instanceof URLSearchParams ? params : new URLSearchParams(params);
  return `${API_BASE}${SEARCH_ROOT}/?${q.toString()}`;
}

export function detailUrl(API_BASE, itemType, itemId) {
  return `${API_BASE}${SEARCH_ROOT}/detail/?type=${encodeURIComponent(itemType)}&id=${encodeURIComponent(itemId)}`;
}

export function albumOverviewUrl(API_BASE, album, artist) {
  return `${API_BASE}${SEARCH_ROOT}/album-overview/?album=${encodeURIComponent(album)}&artist=${encodeURIComponent(artist)}`;
}

export function listsIndexUrl(API_BASE, listType) {
  const base = `${API_BASE}${SEARCH_ROOT}/lists/`;
  if (listType == null || listType === "") return base;
  return `${base}?list_type=${encodeURIComponent(listType)}`;
}

export function listDetailUrl(API_BASE, listId) {
  return `${API_BASE}${SEARCH_ROOT}/lists/${listId}/`;
}

export function listItemsCheckUrl(API_BASE, resourceType, resourceId) {
  return `${API_BASE}${SEARCH_ROOT}/lists/items/check/?type=${encodeURIComponent(resourceType)}&id=${encodeURIComponent(resourceId)}`;
}

export function listItemsUrl(API_BASE) {
  return `${API_BASE}${SEARCH_ROOT}/lists/items/`;
}

export function manualSpotifyMatchesUrl(API_BASE, releaseId) {
  return `${API_BASE}${SEARCH_ROOT}/manual-spotify-matches/?release_id=${encodeURIComponent(releaseId)}`;
}

export function manualSpotifyMatchUrl(API_BASE) {
  return `${API_BASE}${SEARCH_ROOT}/manual-spotify-match/`;
}

export function especiallyLikedTracksUrl(API_BASE, itemType, itemId) {
  return `${API_BASE}${SEARCH_ROOT}/especially-liked-tracks/?item_type=${encodeURIComponent(itemType)}&item_id=${encodeURIComponent(itemId)}`;
}

export function especiallyLikedTrackUrl(API_BASE) {
  return `${API_BASE}${SEARCH_ROOT}/especially-liked-track/`;
}
