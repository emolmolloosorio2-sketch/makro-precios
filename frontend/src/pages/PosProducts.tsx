import { useEffect, useState } from 'react'
import { posListProducts, posCreateProduct, posUpdateProduct, posDeleteProduct, posListCategories, posCreateCategory, posUpdateStock, PosProduct, PosCategory } from '../services/api'

export default function PosProducts() {
  const [products, setProducts] = useState<PosProduct[]>([])
  const [categories, setCategories] = useState<PosCategory[]>([])
  const [search, setSearch] = useState('')
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
  const [stockAdj, setStockAdj] = useState(0)

  useEffect(() => {
    posListCategories().then(setCategories)
  }, [])

  useEffect(() => {
    posListProducts(search || undefined).then(setProducts)
  }, [search])

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
    setProducts(await posListProducts(search || undefined))
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

  async function handleStockAdjust(p: PosProduct) {
    const q = prompt(`Ajustar stock de "${p.name}":`, '0')
    if (q === null) return
    const num = Number(q)
    if (isNaN(num)) return
    await posUpdateStock(p.id, num)
    setProducts(await posListProducts(search || undefined))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Productos</h1>
        <button onClick={() => { resetForm(); setShowForm(true) }} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">
          + Nuevo
        </button>
      </div>

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Buscar producto..."
        className="w-full border rounded-lg px-3 py-2 mb-4"
      />

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

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left p-2">Código</th>
              <th className="text-left p-2">Nombre</th>
              <th className="p-2 text-right">Precio</th>
              <th className="p-2 text-right">Costo</th>
              <th className="p-2 text-right">Stock</th>
              <th className="p-2 text-center">Min</th>
              <th className="p-2 text-center">Cat</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} className="border-b hover:bg-gray-50">
                <td className="p-2 font-mono text-xs">{p.barcode || '—'}</td>
                <td className="p-2">{p.name}</td>
                <td className="p-2 text-right font-medium">S/{p.price.toFixed(2)}</td>
                <td className="p-2 text-right text-gray-500">{p.cost_price ? `S/${p.cost_price.toFixed(2)}` : '—'}</td>
                <td className={`p-2 text-right font-medium ${p.stock <= (p.min_stock ?? 0) ? 'text-red-600' : ''}`}>{p.stock}</td>
                <td className="p-2 text-center text-gray-400">{p.min_stock ?? '—'}</td>
                <td className="p-2 text-center text-xs">{p.category_name || '—'}</td>
                <td className="p-2">
                  <div className="flex gap-1">
                    <button onClick={() => edit(p)} className="text-blue-600 text-xs">Editar</button>
                    <button onClick={() => handleStockAdjust(p)} className="text-green-600 text-xs">Stock</button>
                    <button onClick={() => handleDelete(p.id)} className="text-red-600 text-xs">Eliminar</button>
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
