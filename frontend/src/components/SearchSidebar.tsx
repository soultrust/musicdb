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
          <div className="search-year-filter" aria-label="Album filters">
            <label className="search-year-label">Artist</label>
            <input
              type="text"
              value={s.filterArtist}
              onChange={(e) => s.setFilterArtist(e.target.value)}
              placeholder="Filter by artist"
              className="search-year-input search-artist-input"
              aria-label="Artist filter"
            />
            <label className="search-year-label">Release year</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={s.filterYear}
              onChange={s.allowDigitsOnly(s.setFilterYear)}
              placeholder="Year"
              className="search-year-input"
              aria-label="Single year"
            />
            <label className="search-year-label">Year range</label>
            <div className="search-year-range">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={s.filterYearFrom}
                onChange={s.allowDigitsOnly(s.setFilterYearFrom)}
                placeholder="From"
                className="search-year-input"
                aria-label="From year"
              />
              <span className="search-year-range-sep">–</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={s.filterYearTo}
                onChange={s.allowDigitsOnly(s.setFilterYearTo)}
                placeholder="To"
                className="search-year-input"
                aria-label="To year"
              />
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
