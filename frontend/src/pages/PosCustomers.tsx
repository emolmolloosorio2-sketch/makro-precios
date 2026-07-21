import { useEffect, useState } from 'react'
import { posListCustomers, posCreateCustomer, posCustomerHistory, PosCustomer, CustomerSale } from '../services/api'

export default function PosCustomers() {
  const [customers, setCustomers] = useState<PosCustomer[]>([])
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [selected, setSelected] = useState<PosCustomer | null>(null)
  const [history, setHistory] = useState<CustomerSale[]>([])

  useEffect(() => {
    posListCustomers(search || undefined).then(setCustomers)
  }, [search])

  async function openDetail(c: PosCustomer) {
    setSelected(c)
    setHistory(await posCustomerHistory(c.id))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const c = await posCreateCustomer({ name: name.trim(), phone: phone.trim() || undefined })
    setCustomers(prev => [...prev, c])
    setName(''); setPhone(''); setShowForm(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm">
          + Nuevo
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-lg border p-4 mb-4 flex gap-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre" required className="flex-1 border rounded px-3 py-1.5" />
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Teléfono" className="w-40 border rounded px-3 py-1.5" />
          <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm">Guardar</button>
          <button type="button" onClick={() => setShowForm(false)} className="border px-4 py-1.5 rounded-lg text-sm">Cancelar</button>
        </form>
      )}

      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Buscar cliente..."
        className="w-full border rounded-lg px-3 py-2 mb-4"
      />

      <div className="grid gap-2">
        {customers.map(c => (
          <button
            key={c.id}
            onClick={() => openDetail(c)}
            className={`w-full bg-white rounded-lg border p-4 flex items-center justify-between text-left hover:bg-gray-50 ${selected?.id === c.id ? 'ring-2 ring-blue-400' : ''}`}
          >
            <div>
              <h3 className="font-medium">{c.name}</h3>
              {c.phone && <p className="text-sm text-gray-500">{c.phone}</p>}
            </div>
            <div className="text-right">
              {c.debt_balance > 0 ? (
                <span className="text-red-600 font-bold">Debe: S/ {c.debt_balance.toFixed(2)}</span>
              ) : (
                <span className="text-green-600 text-sm">Sin deuda</span>
              )}
            </div>
          </button>
        ))}
        {customers.length === 0 && (
          <p className="text-center text-gray-400 py-8">Sin clientes registrados</p>
        )}
      </div>

      {/* History modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">{selected.name}</h3>
                <p className="text-sm text-red-600">Debe: S/ {selected.debt_balance.toFixed(2)}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 text-2xl">&times;</button>
            </div>
            <div className="p-4 space-y-4">
              {history.length === 0 && <p className="text-gray-400 text-center py-4">Sin compras registradas</p>}
              {history.map(s => (
                <div key={s.sale_id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">{new Date(s.date).toLocaleDateString()}</span>
                    <span className="text-xs text-gray-400">Venta #{s.sale_id}</span>
                  </div>
                  <table className="w-full text-sm mb-2">
                    <thead><tr className="text-xs text-gray-400 border-b"><th className="text-left p-1">Producto</th><th className="p-1 text-right">Cant</th><th className="p-1 text-right">Precio</th><th className="p-1 text-right">Subtotal</th></tr></thead>
                    <tbody>
                      {s.items.map((item, i) => (
                        <tr key={i} className="border-b">
                          <td className="p-1">{item.product_name}</td>
                          <td className="p-1 text-right">{item.quantity}</td>
                          <td className="p-1 text-right">S/{item.unit_price.toFixed(2)}</td>
                          <td className="p-1 text-right">S/{item.subtotal.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="text-xs space-y-0.5 text-right">
                    <p>Total: <span className="font-bold">S/ {s.total.toFixed(2)}</span></p>
                    {s.cash_paid > 0 && <p className="text-green-600">Al contado: S/ {s.cash_paid.toFixed(2)}</p>}
                    {s.debt_total > 0 && <p className="text-orange-600">A crédito: S/ {s.debt_total.toFixed(2)}</p>}
                    {s.debt_balance > 0 && <p className="text-red-600">Saldo pendiente: S/ {s.debt_balance.toFixed(2)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
