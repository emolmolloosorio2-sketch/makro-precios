import { useEffect, useRef, useState } from 'react'
import { posListProducts, posCreateProduct, posUpdateProduct, posDeleteProduct, posListCategories, posCreateCategory, posGetProductByBarcode, PosProduct, PosCategory } from '../services/api'

export default function PosProducts() {
  const [products, setProducts] = useState<PosProduct[]>([])
  const [categories, setCategories] = useState<PosCategory[]>([])
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<PosProduct | null>(null)
  const [name, setName] = useState('')
  const [barcode, setBarcode] = useState('')
  const [price, setPrice] = useState(0)
  const [costPrice, setCostPrice] = useState<number | undefined>()
  const [stock, setStock] = useState(0)
  const [minStock, setMinStock] = useState<number | undefined>()
  const [unit, setUnit] = useState('unidad')
  const [categoryId, setCategoryId] = useState<number | undefined>()
  const [newCat, setNewCat] = useState('')
  // Global barcode scanner (same as POS)
  const scanBuf = useRef('')
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'Enter') {
        const code = scanBuf.current.trim()
        if (code) {
          e.preventDefault()
          scanBuf.current = ''
          handleScanBarcode(code)
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        scanBuf.current += e.key
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function handleScanBarcode(code: string) {
    if (!code.trim()) return
    try {
      const p = await posGetProductByBarcode(code.trim())
      edit(p)
      setScanCode('')
      setTimeout(() => scanRef.current?.focus(), 0)
    } catch {
      resetForm()
      setBarcode(code.trim())
      setName('')
      setPrice(0)
      setStock(0)
      setShowForm(true)
      setScanCode('')
      setTimeout(() => scanRef.current?.focus(), 0)
    }
  }

  useEffect(() => {
    posListCategories().then(setCategories)
  }, [])

  useEffect(() => {
    posListProducts(search || undefined, catFilter || undefined).then(setProducts)
  }, [search, catFilter])

  function edit(p: PosProduct) {
    setEditing(p)
    setName(p.name)
    setBarcode(p.barcode || '')
    setPrice(p.price)
    setCostPrice(p.cost_price || undefined)
    setStock(p.stock)
    setMinStock(p.min_stock || undefined)
    setUnit(p.unit)
    setCategoryId(p.category_id || undefined)
    setShowForm(true)
  }

  function resetForm() {
    setEditing(null)
    setName(''); setBarcode(''); setPrice(0); setCostPrice(undefined)
    setStock(0); setMinStock(undefined); setUnit('unidad'); setCategoryId(undefined)
    setShowForm(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const data = { name, barcode: barcode || undefined, price, cost_price: costPrice, stock, min_stock: minStock, unit, category_id: categoryId }
    if (editing) {
      await posUpdateProduct(editing.id, data)
    } else {
      await posCreateProduct(data)
    }
    resetForm()
    setProducts(await posListProducts(search || undefined, catFilter || undefined))
  }

  async function handleDelete(id: number) {
    if (!confirm('¿Eliminar producto?')) return
    await posDeleteProduct(id)
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  async function handleAddCategory() {
    if (!newCat.trim()) return
    const c = await posCreateCategory(newCat.trim())
    setCategories(prev => [...prev, c])
    setNewCat('')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Productos</h1>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm">
          + Nuevo
        </button>
      </div>

      <input type="text" className="sr-only" autoFocus />
      <div className="flex gap-1 md:gap-2 mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar producto..."
          className="flex-1 border rounded-lg px-2 md:px-3 py-2 text-sm md:text-base min-w-0"
        />
        <select
          value={catFilter}
          onChange={e => setCatFilter(Number(e.target.value))}
          className="border rounded-lg px-2 md:px-3 py-2 text-sm md:text-base w-auto"
        >
          <option value={0}>Todas</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button
          onClick={async () => {
            const name = prompt('Nombre de la nueva categoría:')
            if (name?.trim()) {
              await posCreateCategory(name.trim())
              setCategories(await posListCategories())
            }
          }}
          className="border rounded-lg px-2 md:px-3 py-2 text-sm md:text-base hover:bg-gray-50 shrink-0"
          title="Agregar categoría"
        >+</button>
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded-lg border p-4 mb-4 space-y-3">
          <h3 className="font-bold">{editing ? 'Editar' : 'Nuevo'} Producto</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-500">Nombre</label>
              <input value={name} onChange={e => setName(e.target.value)} required className="w-full border rounded px-2 py-1.5" />
            </div>
            <div>
              <label className="text-sm text-gray-500">Código de barras</label>
              <input value={barcode} onChange={e => setBarcode(e.target.value)} className="w-full border rounded px-2 py-1.5" />
            </div>
            <div>
              <label className="text-sm text-gray-500">Precio venta</label>
              <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} step="0.01" required className="w-full border rounded px-2 py-1.5" />
            </div>
            <div>
              <label className="text-sm text-gray-500">Precio costo</label>
              <input type="number" value={costPrice ?? ''} onChange={e => setCostPrice(e.target.value ? Number(e.target.value) : undefined)} step="0.01" className="w-full border rounded px-2 py-1.5" />
            </div>
            <div>
              <label className="text-sm text-gray-500">Stock</label>
              <input type="number" value={stock} onChange={e => setStock(Number(e.target.value))} step="0.01" className="w-full border rounded px-2 py-1.5" />
            </div>
            <div>
              <label className="text-sm text-gray-500">Stock mínimo</label>
              <input type="number" value={minStock ?? ''} onChange={e => setMinStock(e.target.value ? Number(e.target.value) : undefined)} step="0.01" className="w-full border rounded px-2 py-1.5" />
            </div>
            <div>
              <label className="text-sm text-gray-500">Unidad</label>
              <input value={unit} onChange={e => setUnit(e.target.value)} className="w-full border rounded px-2 py-1.5" />
            </div>
            <div>
              <label className="text-sm text-gray-500">Categoría</label>
              <select value={categoryId ?? ''} onChange={e => setCategoryId(e.target.value ? Number(e.target.value) : undefined)} className="w-full border rounded px-2 py-1.5">
                <option value="">Sin categoría</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <div className="flex gap-1 mt-1">
                <input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="Nueva categoría" className="flex-1 border rounded px-2 py-0.5 text-xs" />
                <button type="button" onClick={handleAddCategory} className="text-blue-600 text-xs">+</button>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">Guardar</button>
            <button type="button" onClick={resetForm} className="border px-4 py-2 rounded-lg text-sm">Cancelar</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-lg border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left p-1 md:p-2">Nombre</th>
              <th className="p-1 md:p-2 text-right">Precio</th>
              <th className="p-1 md:p-2 text-right hidden md:table-cell">Costo</th>
              <th className="p-1 md:p-2 text-right">Stock</th>
              <th className="p-1 md:p-2 text-center hidden md:table-cell">Min</th>
              <th className="p-1 md:p-2 text-center hidden md:table-cell">Cat</th>
              <th className="p-0.5 md:p-2"></th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} className="border-b hover:bg-gray-50">
                <td className="p-1 md:p-2">{p.name}</td>
                <td className="p-1 md:p-2 text-right font-medium">S/{p.price.toFixed(2)}</td>
                <td className="p-1 md:p-2 text-right text-gray-500 hidden md:table-cell">{p.cost_price ? `S/${p.cost_price.toFixed(2)}` : '—'}</td>
                <td className={`p-1 md:p-2 text-right font-medium ${p.stock <= (p.min_stock ?? 0) ? 'text-red-600' : ''}`}>{p.stock}</td>
                <td className="p-1 md:p-2 text-center text-gray-400 text-xs hidden md:table-cell">{p.min_stock ?? '—'}</td>
                <td className="p-1 md:p-2 text-center text-[10px] md:text-xs hidden md:table-cell">{p.category_name || '—'}</td>
                <td className="p-0.5 md:p-2 whitespace-nowrap">
                  <div className="flex gap-1">
                    <button onClick={() => edit(p)} className="w-7 h-7 flex items-center justify-center border border-blue-300 rounded text-blue-600 text-base hover:bg-blue-50" title="Editar">✎</button>
                    <button onClick={() => handleDelete(p.id)} className="w-7 h-7 flex items-center justify-center border border-red-300 rounded text-red-600 text-base hover:bg-red-50" title="Eliminar">✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
