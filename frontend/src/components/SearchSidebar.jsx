export default function SearchSidebar({
  handleSubmit,
  searchType,
  setSearchType,
  query,
  setQuery,
  loading,
  viewListId,
  filterArtist,
  setFilterArtist,
  filterYear,
  setFilterYear,
  filterYearFrom,
  setFilterYearFrom,
  filterYearTo,
  setFilterYearTo,
  allowDigitsOnly,
  error,
  spotifyPlaylistsLoading,
  spotifyToken,
  spotifyPlaylists,
  selectedPlaylistId,
  setSelectedPlaylistId,
  setSelectedItem,
  setDetailData,
  listViewData,
  listViewLoading,
  handleItemClick,
  results,
  selectedItem,
}) {
  return (
    <div className="sidebar">
      <form onSubmit={handleSubmit} className="search-form">
        <select
          value={searchType}
          onChange={(e) => setSearchType(e.target.value)}
          className="search-type-select"
          aria-label="Search type"
        >
          <option value="artist">Artist</option>
          <option value="album">Album</option>
          <option value="song">Song</option>
        </select>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={
            searchType === "artist"
              ? "Search artists…"
              : searchType === "song"
                ? "Search songs…"
                : "Search albums…"
          }
          disabled={loading}
          autoFocus={viewListId == null}
        />
        {searchType === "album" && (
          <div className="search-year-filter" aria-label="Album filters">
            <label className="search-year-label">Artist</label>
            <input
              type="text"
              value={filterArtist}
              onChange={(e) => setFilterArtist(e.target.value)}
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
              value={filterYear}
              onChange={allowDigitsOnly(setFilterYear)}
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
                value={filterYearFrom}
                onChange={allowDigitsOnly(setFilterYearFrom)}
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
                value={filterYearTo}
                onChange={allowDigitsOnly(setFilterYearTo)}
                placeholder="To"
                className="search-year-input"
                aria-label="To year"
              />
            </div>
          </div>
        )}
        <button type="submit" disabled={loading} className="search-submit-btn">
          {loading ? "Searching…" : "Search"}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      {viewListId === "spotify-playlists" ? (
        <>
          <div className="list-view-header">
            <span className="list-view-title">Shared Playlists</span>
          </div>
          {spotifyPlaylistsLoading && <p className="detail-loading">Loading playlists…</p>}
          {!spotifyToken && <p className="list-view-empty">Connect to Spotify to view playlists.</p>}
          <ul className="results">
            {spotifyPlaylists.map((playlist) => (
              <li
                key={playlist.id}
                className={selectedPlaylistId === playlist.id ? "selected" : ""}
                onClick={() => {
                  setSelectedPlaylistId(playlist.id);
                  setSelectedItem(null);
                  setDetailData(null);
                }}
              >
                {playlist.name}
                {playlist.owner && <span className="playlist-owner"> by {playlist.owner}</span>}
              </li>
            ))}
          </ul>
          {!spotifyPlaylistsLoading && spotifyToken && spotifyPlaylists.length === 0 && (
            <p className="list-view-empty">No playlists found.</p>
          )}
        </>
      ) : viewListId != null ? (
        <>
          <div className="list-view-header">
            <span className="list-view-title">List: {listViewData?.name ?? "…"}</span>
          </div>
          {listViewLoading && <p className="detail-loading">Loading list…</p>}
          <ul className="results">
            {(listViewData?.items || []).map((item, i) => (
              <li
                key={item.id != null ? `${item.type}-${item.id}` : i}
                className={
                  selectedItem?.id === String(item.id) && selectedItem?.type === item.type
                    ? "selected"
                    : ""
                }
                onClick={() => handleItemClick({ id: item.id, type: item.type, title: item.title })}
              >
                {item.title}
              </li>
            ))}
          </ul>
          {!listViewLoading && listViewData && (!listViewData.items || listViewData.items.length === 0) && (
            <p className="list-view-empty">This list is empty.</p>
          )}
        </>
      ) : (
        <>
          {loading && <p className="detail-loading">Loading…</p>}
          <ul className="results">
            {results.map((item, i) => (
              <li
                key={item.id != null ? `${item.type}-${item.id}` : i}
                className={
                  selectedItem &&
                  String(selectedItem.id) === String(item.id) &&
                  selectedItem?.type === item.type
                    ? "selected"
                    : ""
                }
                onClick={() => handleItemClick(item)}
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

