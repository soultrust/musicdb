import { useSearchSidebarContext } from "../hooks/useMusicDbApp";

export default function SearchSidebar() {
  const s = useSearchSidebarContext();
  return (
    <div className="sidebar">
      <form onSubmit={s.handleSubmit} className="search-form">
        <select
          value={s.searchType}
          onChange={(e) => s.setSearchType(e.target.value)}
          className="search-type-select"
          aria-label="Search type"
        >
          <option value="artist">Artist</option>
          <option value="album">Album</option>
          <option value="song">Song</option>
        </select>
        <input
          type="search"
          value={s.query}
          onChange={(e) => s.setQuery(e.target.value)}
          placeholder={
            s.searchType === "artist"
              ? "Search artists…"
              : s.searchType === "song"
                ? "Search songs…"
                : "Search albums…"
          }
          disabled={s.loading}
          autoFocus={s.viewListId == null}
        />
        {s.searchType === "album" && (
          <div className="search-album-filters" aria-label="Album filters">
            <div className="search-album-filters-row">
              <div className="search-album-filter-field search-album-filter-artist">
                <label className="search-album-filter-label" htmlFor="search-album-artist">
                  Artist
                </label>
                <input
                  id="search-album-artist"
                  type="text"
                  value={s.filterArtist}
                  onChange={(e) => s.setFilterArtist(e.target.value)}
                  placeholder="Filter by artist"
                  className="search-album-filter-input"
                  aria-label="Artist filter"
                />
              </div>
              <div className="search-album-filter-field search-album-filter-year">
                <label className="search-album-filter-label" htmlFor="search-album-year">
                  Release year
                </label>
                <input
                  id="search-album-year"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={s.filterYear}
                  onChange={s.allowDigitsOnly(s.setFilterYear)}
                  placeholder="Year"
                  className="search-album-filter-input"
                  aria-label="Release year"
                />
              </div>
            </div>
          </div>
        )}
        <button type="submit" disabled={s.loading} className="search-submit-btn">
          {s.loading ? "Searching…" : "Search"}
        </button>
      </form>
      {s.error && <p className="error">{s.error}</p>}
      {s.viewListId === "spotify-playlists" ? (
        <>
          <div className="list-view-header">
            <span className="list-view-title">Shared Playlists</span>
          </div>
          {s.spotifyPlaylistsLoading && <p className="detail-loading">Loading playlists…</p>}
          {!s.spotifyToken && <p className="list-view-empty">Connect to Spotify to view playlists.</p>}
          <ul className="results">
            {s.spotifyPlaylists.map((playlist) => (
              <li
                key={playlist.id}
                className={s.selectedPlaylistId === playlist.id ? "selected" : ""}
                onClick={() => {
                  s.setSelectedPlaylistId(playlist.id);
                  s.setSelectedItem(null);
                  s.setDetailData(null);
                }}
              >
                {playlist.name}
                {playlist.owner && <span className="playlist-owner"> by {playlist.owner}</span>}
              </li>
            ))}
          </ul>
          {!s.spotifyPlaylistsLoading && s.spotifyToken && s.spotifyPlaylists.length === 0 && (
            <p className="list-view-empty">No playlists found.</p>
          )}
        </>
      ) : s.viewListId != null ? (
        <>
          <div className="list-view-header">
            <span className="list-view-title">List: {s.listViewData?.name ?? "…"}</span>
          </div>
          {s.listViewLoading && <p className="detail-loading">Loading list…</p>}
          <ul className="results">
            {(s.listViewData?.items || []).map((item, i) => (
              <li
                key={item.id != null ? `${item.type}-${item.id}` : i}
                className={
                  s.selectedItem?.id === String(item.id) && s.selectedItem?.type === item.type
                    ? "selected"
                    : ""
                }
                onClick={() => s.handleItemClick({ id: item.id, type: item.type, title: item.title })}
              >
                {item.title}
              </li>
            ))}
          </ul>
          {!s.listViewLoading && s.listViewData && (!s.listViewData.items || s.listViewData.items.length === 0) && (
            <p className="list-view-empty">This list is empty.</p>
          )}
        </>
      ) : s.selectedItem?.type === "artist" ? (
        <>
          <div className="list-view-header">
            <span className="list-view-title">
              Albums
              {s.detailData?.title
                ? ` — ${s.detailData.title}`
                : s.selectedItem?.title
                  ? ` — ${s.selectedItem.title}`
                  : ""}
            </span>
          </div>
          {s.detailLoading && <p className="detail-loading">Loading albums…</p>}
          <ul className="results">
            {(s.detailData?.albums ?? []).map((album, i) => (
              <li
                key={album.id != null ? `album-${album.id}` : i}
                className={
                  s.selectedItem &&
                  String(s.selectedItem.id) === String(album.id) &&
                  s.selectedItem?.type === "album"
                    ? "selected"
                    : ""
                }
                onClick={() =>
                  s.handleItemClick({
                    id: String(album.id),
                    type: "album",
                    title: album.title ?? "",
                  })
                }
              >
                {album.year ? `${album.year} — ` : ""}
                {album.title ?? album.id}
              </li>
            ))}
          </ul>
          {!s.detailLoading &&
            s.detailData &&
            (s.detailData.albums ?? []).length === 0 && (
              <p className="list-view-empty">No albums found for this artist.</p>
            )}
        </>
      ) : (
        <>
          {s.loading && <p className="detail-loading">Loading…</p>}
          <ul className="results">
            {s.results.map((item, i) => (
              <li
                key={item.id != null ? `${item.type}-${item.id}` : i}
                className={
                  s.selectedItem &&
                  String(s.selectedItem.id) === String(item.id) &&
                  s.selectedItem?.type === item.type
                    ? "selected"
                    : ""
                }
                onClick={() => s.handleItemClick(item)}
              >
                {item.title}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
