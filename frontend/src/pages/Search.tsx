import { useState } from 'react'
import { Link } from 'react-router-dom'
import { searchProducts, SearchResult } from '../services/api'

export default function Search() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    try {
      const data = await searchProducts(query)
      setResults(data)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
    setSearched(true)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Buscar Productos</h1>

      <form onSubmit={handleSearch} className="flex gap-3 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ej: arroz, aceite, leche, fideo..."
          className="border rounded-lg px-4 py-2 flex-1"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {loading && <div className="text-center py-8 text-gray-500">Buscando...</div>}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No se encontraron productos. Intentá con otros términos.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {results.map((r) => (
          <Link
            key={r.id}
            to={`/product/${r.id}`}
            className="bg-white rounded-lg shadow-sm border hover:shadow-md transition p-4"
          >
            {r.image_url && (
              <img
                src={r.image_url}
                alt={r.name}
                className="w-full h-40 object-contain mb-3"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            )}
            <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mb-2">
              {r.name}
            </h3>
            <p className="text-xs text-gray-400 mb-1">{r.brand}</p>
            {r.current_price !== null && (
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-blue-600">
                  S/ {r.current_price.toFixed(2)}
                </span>
                {r.original_price && r.original_price > 0 && r.original_price !== r.current_price && (
                  <span className="text-sm text-gray-400 line-through">
                    S/ {r.original_price.toFixed(2)}
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-400">{r.store}</span>
              {r.similarity !== undefined && (
                <span className="text-xs text-gray-400">
                  {(r.similarity * 100).toFixed(0)}% match
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
