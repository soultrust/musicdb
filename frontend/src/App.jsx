import { useState } from 'react'
import './App.css'

const API_BASE = 'http://localhost:8000'

function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [detailData, setDetailData] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    setResults([])
    try {
      const res = await fetch(
        `${API_BASE}/api/search/?q=${encodeURIComponent(query.trim())}`
      )
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || `Request failed: ${res.status}`)
        return
      }
      setResults(data.results || [])
      setSelectedItem(null)
      setDetailData(null)
    } catch (err) {
      setError(err.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleItemClick(item) {
    setSelectedItem(item)
    setDetailData(null)
    setDetailError(null)
    
    if (!item.id || !item.type) {
      setDetailError('Item missing id or type')
      return
    }
    
    setDetailLoading(true)
    try {
      const res = await fetch(
        `${API_BASE}/api/search/detail/?type=${encodeURIComponent(item.type)}&id=${encodeURIComponent(item.id)}`
      )
      const data = await res.json()
      if (!res.ok) {
        setDetailError(data.error || `Request failed: ${res.status}`)
        return
      }
      setDetailData(data)
    } catch (err) {
      setDetailError(err.message || 'Request failed')
    } finally {
      setDetailLoading(false)
    }
  }

  return (
    <div className="app">
      <h1>Discogs Search</h1>
      <form onSubmit={handleSubmit} className="search-form">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search releases, artists, labels…"
          disabled={loading}
          autoFocus
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      <div className="content">
        <ul className="results">
          {results.map((item, i) => (
            <li
              key={item.id != null ? `${item.type}-${item.id}` : i}
              className={selectedItem?.id === item.id ? 'selected' : ''}
              onClick={() => handleItemClick(item)}
            >
              {item.title}
            </li>
          ))}
        </ul>
        {selectedItem && (
          <div className="detail">
            {detailLoading && <p className="detail-loading">Loading details…</p>}
            {detailError && <p className="error">{detailError}</p>}
            {detailData && (
              <>
                <div className="detail-header">
                  <div className="detail-thumb-container">
                    {(detailData.thumb || detailData.images?.[0]?.uri) ? (
                      <img 
                        src={detailData.thumb || detailData.images?.[0]?.uri} 
                        alt={detailData.title || selectedItem.title} 
                        className="detail-thumb"
                        onError={(e) => {
                          console.error('Image failed to load:', detailData.thumb || detailData.images?.[0]?.uri);
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="detail-thumb-placeholder">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="detail-content">
                    <h2>{detailData.title || selectedItem.title}</h2>
                    <div className="detail-meta">
                      {detailData.artists && detailData.artists.length > 0 && (
                        <div className="detail-row">
                          <span className="label">Artist:</span>
                          <span className="value">{detailData.artists.map(a => a.name).join(', ')}</span>
                        </div>
                      )}
                      {detailData.year && (
                        <div className="detail-row">
                          <span className="label">Year:</span>
                          <span className="value">{detailData.year}</span>
                        </div>
                      )}
                      {detailData.formats && detailData.formats.length > 0 && (
                        <div className="detail-row">
                          <span className="label">Format:</span>
                          <span className="value">{detailData.formats.map(f => f.name + (f.qty ? ` (${f.qty})` : '')).join(', ')}</span>
                        </div>
                      )}
                      {detailData.country && (
                        <div className="detail-row">
                          <span className="label">Country:</span>
                          <span className="value">{detailData.country}</span>
                        </div>
                      )}
                      {detailData.genres && detailData.genres.length > 0 && (
                        <div className="detail-row">
                          <span className="label">Genre:</span>
                          <span className="value">{detailData.genres.join(', ')}</span>
                        </div>
                      )}
                      {detailData.styles && detailData.styles.length > 0 && (
                        <div className="detail-row">
                          <span className="label">Style:</span>
                          <span className="value">{detailData.styles.join(', ')}</span>
                        </div>
                      )}
                      {detailData.labels && detailData.labels.length > 0 && (
                        <div className="detail-row">
                          <span className="label">Label:</span>
                          <span className="value">{detailData.labels.map(l => l.name + (l.catno ? ` (${l.catno})` : '')).join(', ')}</span>
                        </div>
                      )}
                      {detailData.uri && (
                        <div className="detail-row">
                          <a href={detailData.uri} target="_blank" rel="noopener noreferrer" className="detail-link">
                            View on Discogs →
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {detailData.tracklist && detailData.tracklist.length > 0 && (
                  <div className="detail-tracklist">
                    <h3>Tracklist</h3>
                    <ol className="tracklist">
                      {detailData.tracklist.map((track, i) => (
                        <li key={i}>
                          <span className="track-position">{track.position || `${i + 1}.`}</span>
                          <span className="track-title">{track.title}</span>
                          {track.duration && <span className="track-duration">{track.duration}</span>}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                {detailData.profile && (
                  <div className="detail-profile">
                    <h3>Profile</h3>
                    <p>{detailData.profile}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
