import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProducts, getProductsCount, getRecentUpdates, triggerScrape, Product } from '../services/api'

const CATEGORIES = [
  '', 'Abarrotes', 'Lácteos', 'Bebidas', 'Limpieza', 'Cuidado Personal',
]
const PAGE_SIZE = 24

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [scraping, setScraping] = useState(false)
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [mode, setMode] = useState<'catalog' | 'recent'>('catalog')
  const [onlyChanged, setOnlyChanged] = useState(false)
  const [sortBy, setSortBy] = useState<'absolute' | 'percentage'>('absolute')
  const loadId = useRef(0)

  useEffect(() => {
    if (mode === 'catalog') {
      setPage(0)
      loadProducts(0)
    }
  }, [category, search, mode])

  async function loadRecent(oc?: boolean, sorter?: 'absolute' | 'percentage') {
    const oc2 = oc ?? onlyChanged
    const sb = sorter ?? sortBy
    const id = ++loadId.current
    setLoading(true)
    setMode('recent')
    try {
      const data = await getRecentUpdates('Makro', oc2, 100, sb)
      if (id !== loadId.current) return
      setProducts(data)
      setTotal(data.length)
      setPage(0)
    } catch (e) {
      console.error(e)
    }
    if (id === loadId.current) setLoading(false)
  }

  function getPrevPrice(p: Product): number | null {
    if (p.price_history && p.price_history.length > 1) {
      return p.price_history[1].price
    }
    return null
  }

  async function loadProducts(pageNum: number) {
    const id = ++loadId.current
    setLoading(true)
    try {
      const cat = category || undefined
      const sq = search || undefined
      const [count, data] = await Promise.all([
        getProductsCount('Makro', cat, sq),
        getProducts('Makro', pageNum * PAGE_SIZE, PAGE_SIZE, cat, sq),
      ])
      if (id !== loadId.current) return
      setTotal(count)
      setProducts(data)
      setPage(pageNum)
    } catch (e) {
      console.error(e)
    }
    if (id === loadId.current) setLoading(false)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function goToPage(p: number) {
    if (p < 0 || p >= totalPages) return
    loadProducts(p)
  }

  async function handleScrape() {
    setScraping(true)
    try {
      const result = await triggerScrape('makro')
      alert(`Makro: ${result.products_saved} productos actualizados`)
      loadProducts(page)
    } catch (e) {
      alert('Error al escrapear')
    }
    setScraping(false)
  }

  function getCurrentPrice(p: Product): number | null {
    if (p.price_history && p.price_history.length > 0) {
      return p.price_history[0].price
    }
    return null
  }

  function getOriginalPrice(p: Product): number | null {
    if (p.price_history && p.price_history.length > 0) {
      return p.price_history[0].original_price
    }
    return null
  }

  function getDiscount(p: Product): number | null {
    if (p.price_history && p.price_history.length > 0) {
      return p.price_history[0].discount_percentage
    }
    return null
  }

  const filtered = products

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Makro</h1>
          {mode === 'recent' ? (
            <>
              <button
                onClick={() => { setMode('catalog'); setSearch(''); setCategory(''); }}
                className="text-sm text-blue-600 hover:underline"
              >
                &larr; Volver al catálogo
              </button>
              <label className="flex items-center gap-1 text-sm text-gray-500 cursor-pointer">
                <input type="checkbox" checked={onlyChanged} onChange={(e) => { setOnlyChanged(e.target.checked); loadRecent(e.target.checked); }} className="accent-blue-600" />
                Solo cambios
              </label>
              <button
                onClick={() => { const s = sortBy === 'absolute' ? 'percentage' : 'absolute'; setSortBy(s); loadRecent(undefined, s); }}
                className={`text-xs px-2 py-1 rounded border ${sortBy === 'percentage' ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}
              >
                % mayor cambio
              </button>
            </>
          ) : (
            <>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c || 'Todas'}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm w-48"
              />
            </>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setOnlyChanged(true); setSortBy('absolute'); loadRecent(true, 'absolute'); }}
            className="border rounded-lg px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            &Uacute;ltimos cambios
          </button>
          <button
            onClick={handleScrape}
            disabled={scraping}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
          >
            {scraping ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {search ? 'Sin resultados' : 'No hay productos. Haz clic en "Actualizar".'}
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-400 mb-3">{total} productos</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((p) => {
              const price = getCurrentPrice(p)
              const original = getOriginalPrice(p)
              const discount = getDiscount(p)
              return (
                <Link
                  key={p.id}
                  to={`/product/${p.id}`}
                  className="bg-white rounded-lg shadow-sm border hover:shadow-md transition p-4"
                >
                  {p.image_url && (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="w-full h-40 object-contain mb-3"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  )}
                  <h3 className="text-sm font-medium text-gray-800 line-clamp-2 mb-2">
                    {p.name}
                  </h3>
                  {p.brand && (
                    <p className="text-xs text-gray-400 mb-1">{p.brand}</p>
                  )}
                  <div className="flex items-center gap-2">
                    {price !== null && (
                      <span className="text-lg font-bold text-green-700">
                        S/ {price.toFixed(2)}
                      </span>
                    )}
                    {original && original > 0 && original !== price && (
                      <span className="text-sm text-gray-400 line-through">
                        S/ {original.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {mode === 'recent' && (() => {
                    const prev = getPrevPrice(p)
                    if (prev !== null && price !== null && prev !== price) {
                      const diff = price - prev
                      const pct = (diff / prev) * 100
                      const cls = diff < 0 ? 'text-green-600' : 'text-red-600'
                      return (
                        <p className={`text-xs mt-1 ${cls}`}>
                          Antes: S/ {prev.toFixed(2)} ({diff > 0 ? '+' : ''}S/ {diff.toFixed(2)}, {pct > 0 ? '+' : ''}{pct.toFixed(1)}%)
                        </p>
                      )
                    }
                    return null
                  })()}
                  {discount && discount > 0 && (
                    <span className="inline-block mt-1 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">
                      -{Math.round(discount)}%
                    </span>
                  )}
                  {p.in_store_only === 1 && (
                    <span className="inline-block mt-1 bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded">
                      Solo en tienda
                    </span>
                  )}
                  {p.promotion_data?.min_quantity && (
                    <p className="text-xs text-blue-600 mt-1">
                      {p.promotion_data.min_quantity}× S/{p.promotion_data.discounted_price_per_unit.toFixed(2)} c/u
                    </p>
                  )}
                  {mode === 'recent' && price !== null && getPrevPrice(p) === null && (
                    <span className="inline-block mt-1 bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded">
                      Nuevo
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page === 0 || totalPages <= 1}
              className="px-3 py-1.5 border rounded text-sm disabled:opacity-30 hover:bg-gray-50"
            >
              &laquo; Anterior
            </button>
            <span className="text-sm text-gray-500">
              Página {Math.min(page + 1, totalPages)} de {totalPages}
            </span>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages - 1 || totalPages <= 1}
              className="px-3 py-1.5 border rounded text-sm disabled:opacity-30 hover:bg-gray-50"
            >
              Siguiente &raquo;
            </button>
          </div>
        </>
      )}
    </div>
  )
}
