import { useState } from 'react'
import './App.css'

const API_BASE = 'http://localhost:8000'

function App() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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
    } catch (err) {
      setError(err.message || 'Request failed')
    } finally {
      setLoading(false)
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
      <ul className="results">
        {results.map((item, i) => (
          <li key={item.id != null ? `${item.type}-${item.id}` : i}>
            {item.title}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default App
