import { useEffect, useRef, useState } from 'react'
import {
  posListProducts, posGetProductByBarcode, posListCustomers,
  posCreateSale, posGetTodaySales, posCloseStatus,
  posOpenClose, posCloseCaja, posListCategories, posCreateCategory,
  posSuspendTicket, posListSuspendedTickets, posGetSuspendedTicket, posDiscardTicket,
  PosProduct, PosCustomer, SuspendedTicket,
} from '../services/api'

interface CartItem {
  product_id?: number
  product_name: string
  quantity: number
  unit_price: number
}

export default function POS() {
  const [products, setProducts] = useState<PosProduct[]>([])
  const [categories, setCategories] = useState<{id:number;name:string}[]>([])
  const [customers, setCustomers] = useState<PosCustomer[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [barcode, setBarcode] = useState('')
  const [customerSearch, setCustomerSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<PosCustomer | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [asDebt, setAsDebt] = useState(false)
  const [cashPaidStr, setCashPaidStr] = useState('')
  const [showPayment, setShowPayment] = useState(false)
  const [message, setMessage] = useState('')
  const [todayTotal, setTodayTotal] = useState(0)
  const [catFilter, setCatFilter] = useState(0)
  const [search, setSearch] = useState('')
  const [suspendedTickets, setSuspendedTickets] = useState<SuspendedTicket[]>([])
  const [showTickets, setShowTickets] = useState(false)
  const [showClose, setShowClose] = useState(false)
  const [closeInfo, setCloseInfo] = useState<any>(null)
  const [initialCash, setInitialCash] = useState(0)
  const [finalCash, setFinalCash] = useState(0)
  const [expenses, setExpenses] = useState(0)
  const barcodeRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadData(); loadCloseStatus(); loadTickets() }, [])
  useEffect(() => { loadProducts() }, [catFilter, search])

  async function loadTickets() {
    setSuspendedTickets(await posListSuspendedTickets())
  }

  async function handleSuspend() {
    if (cart.length === 0) return
    await posSuspendTicket(cart.map(i => ({product_id: i.product_id, product_name: i.product_name, quantity: i.quantity, unit_price: i.unit_price})))
    setCart([])
    setMessage('Ticket guardado')
    setTimeout(() => setMessage(''), 2000)
    loadTickets()
  }

  async function handleRecall(ticketId: number) {
    if (cart.length > 0 && !confirm('El carrito actual se perderá. ¿Continuar?')) return
    const t = await posGetSuspendedTicket(ticketId)
    setCart(t.items.map(i => ({product_id: i.product_id, product_name: i.product_name, quantity: i.quantity, unit_price: i.unit_price})))
    setShowTickets(false)
    loadTickets()
  }

  // Global scanner: captures barcodes when no input/textarea is focused
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
          posGetProductByBarcode(code).then(p => addToCart(p)).catch(() => {
            setMessage(`Código ${code} no encontrado`)
            setTimeout(() => setMessage(''), 3000)
          })
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        scanBuf.current += e.key
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function loadData() {
    const [cats, custs] = await Promise.all([
      posListCategories(), posListCustomers(),
    ])
    setCategories(cats)
    setCustomers(custs)
  }

  async function loadProducts() {
    const data = await posListProducts(search || undefined, catFilter || undefined)
    setProducts(data)
  }

  async function loadCloseStatus() {
    const s = await posCloseStatus()
    setCloseInfo(s)
    if (!s.open) setShowClose(true)
    const today = await posGetTodaySales()
    setTodayTotal(today.total)
  }

  async function handleBarcode() {
    const code = barcode.trim()
    if (!code) return
    try {
      const p = await posGetProductByBarcode(code)
      addToCart(p)
      setBarcode('')
      setTimeout(() => barcodeRef.current?.focus(), 0)
    } catch {
      setMessage(`Código ${code} no encontrado`)
      setBarcode('')
      setTimeout(() => barcodeRef.current?.focus(), 0)
    }
  }

  function addToCart(p: PosProduct) {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === p.id)
      if (existing) {
        return prev.map(i =>
          i.product_id === p.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      }
      return [...prev, {
        product_id: p.id,
        product_name: p.name,
        quantity: 1,
        unit_price: p.price,
      }]
    })
  }

  function updateCartItem(index: number, field: keyof CartItem, value: any) {
    setCart(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ))
  }

  function removeFromCart(index: number) {
    setCart(prev => prev.filter((_, i) => i !== index))
  }

  const total = cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)

  function selectProductQuick(p: PosProduct) {
    addToCart(p)
    searchRef.current?.focus()
  }

  async function handlePay() {
    if (cart.length === 0) return
    if (asDebt && !selectedCustomer) {
      setMessage('Selecciona un cliente para la deuda')
      return
    }
    try {
      const sale = await posCreateSale({
        customer_id: selectedCustomer?.id,
        items: cart,
        payment_method: paymentMethod,
        as_debt: asDebt,
        cash_paid: parseFloat(cashPaidStr.replace(/,/g, '.')) || 0,
      })
      setMessage(`Venta #${sale.id} registrada — S/ ${sale.total.toFixed(2)}`)
      setCart([])
      setSelectedCustomer(null)
      setAsDebt(false)
      setCashPaidStr('')
      setShowPayment(false)
      const today = await posGetTodaySales()
      setTodayTotal(today.total)
    } catch (e: any) {
      setMessage('Error: ' + e.message)
    }
  }

  async function handleOpenClose() {
    await posOpenClose(initialCash)
    setShowClose(false)
    setCloseInfo({open: true, initial_cash: initialCash})
  }

  async function handleCloseCaja() {
    if (!closeInfo?.close_id) return
    await posCloseCaja(closeInfo.close_id, finalCash, expenses)
    setMessage('Caja cerrada')
    setShowClose(true)
    setCloseInfo({open: false})
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Left: Cart + Payment */}
      <div className="flex-1">
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">Nueva Venta</h2>
            <span className="text-sm text-gray-500">Hoy: S/ {todayTotal.toFixed(2)}</span>
          </div>

          {/* Barcode scanner hidden — global keydown lo captura */}
          <input
            ref={barcodeRef}
            type="text"
            value={barcode}
            onChange={e => setBarcode(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && barcode.trim()) { e.preventDefault(); handleBarcode() }
            }}
            className="sr-only"
            autoFocus
          />

          {/* Cart */}
          <div className="border rounded-lg mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left p-2">Producto</th>
                  <th className="p-2 w-20">Cant</th>
                  <th className="p-2 w-24">Precio</th>
                  <th className="p-2 w-24">Subtotal</th>
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2">{item.product_name}</td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={e => updateCartItem(i, 'quantity', Math.max(0, Number(e.target.value)))}
                        className="w-16 border rounded px-1 py-0.5 text-center"
                        min={0}
                        step="0.01"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={e => updateCartItem(i, 'unit_price', Number(e.target.value))}
                        className="w-20 border rounded px-1 py-0.5 text-right"
                        step="0.01"
                      />
                    </td>
                    <td className="p-2 text-right">S/ {(item.quantity * item.unit_price).toFixed(2)}</td>
                    <td className="p-2">
                      <button onClick={() => removeFromCart(i)} className="text-red-500 text-lg">&times;</button>
                    </td>
                  </tr>
                ))}
                {cart.length === 0 && (
                  <tr><td colSpan={5} className="p-4 text-center text-gray-400">Carrito vacío</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="text-right space-y-1 mb-4">
            <p className="text-xl font-bold">Total: S/ {total.toFixed(2)}</p>
          </div>

          {/* Actions */}
          {!showPayment ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowPayment(true)}
                  disabled={cart.length === 0}
                  className="bg-green-600 text-white py-3 rounded-lg font-bold text-lg disabled:opacity-50"
                >
                  Cobrar S/ {total.toFixed(2)}
                </button>
                <button
                  onClick={handleSuspend}
                  disabled={cart.length === 0}
                  className="border border-blue-300 text-blue-700 py-3 rounded-lg font-bold text-lg disabled:opacity-40"
                >
                  Guardar ticket
                </button>
              </div>
              {suspendedTickets.length > 0 && (
                <button
                  onClick={() => setShowTickets(true)}
                  className="w-full border border-orange-300 text-orange-700 py-2 rounded-lg text-sm mt-2"
                >
                  Tickets guardados ({suspendedTickets.length})
                </button>
              )}
            </>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setPaymentMethod('paid'); setAsDebt(false) }}
                  className={`py-3 rounded-lg border font-bold text-lg ${paymentMethod === 'paid' && !asDebt ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-50'}`}
                >
                  Pagado
                </button>
                <button
                  onClick={() => { setPaymentMethod('credit'); setAsDebt(true); setCashPaidStr('') }}
                  className={`py-3 rounded-lg border font-bold text-lg ${asDebt ? 'bg-orange-500 text-white border-orange-500' : 'bg-white hover:bg-gray-50'}`}
                >
                  Crédito
                </button>
              </div>
              {asDebt && (
                <div className="border rounded-lg p-3 bg-orange-50">
                  <div className="mb-3">
                    <label className="text-xs font-medium text-orange-700">Al contado:</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={cashPaidStr}
                      onChange={e => {
                        let v = e.target.value.replace(/[^0-9,.]/g, '')
                        if ((v.match(/[.,]/g) || []).length > 1) v = cashPaidStr
                        setCashPaidStr(v)
                      }}
                      onFocus={e => e.target.select()}
                      placeholder="0"
                      className="w-full border rounded-lg px-3 py-2 text-lg font-bold mt-1"
                    />
                    <p className="text-xs text-orange-600 mt-1">Total: S/ {Math.max(0, total - (parseFloat(cashPaidStr.replace(/,/g, '.')) || 0)).toFixed(2)}</p>
                  </div>
                  <p className="text-xs font-medium text-orange-700 mb-2">Cliente:</p>
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    placeholder="Buscar cliente..."
                    className="w-full border rounded-lg px-3 py-1.5 text-sm mb-2"
                  />
                  {customerSearch && (
                    <div className="border rounded-lg max-h-32 overflow-y-auto bg-white mb-2">
                      {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase())).map(c => (
                        <button
                          key={c.id}
                          onClick={() => { setSelectedCustomer(c); setCustomerSearch('') }}
                          className={`block w-full text-left p-2 text-sm hover:bg-blue-50 ${selectedCustomer?.id === c.id ? 'bg-blue-100' : ''}`}
                        >
                          {c.name} {c.debt_balance > 0 && <span className="text-red-500">(S/{c.debt_balance.toFixed(2)})</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedCustomer ? (
                    <div className="flex items-center justify-between bg-white rounded p-2 text-sm border">
                      <span className="font-medium">{selectedCustomer.name}</span>
                      <button onClick={() => setSelectedCustomer(null)} className="text-red-500 text-xs">Cambiar</button>
                    </div>
                  ) : null}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={handlePay} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold">
                  Confirmar
                </button>
                <button onClick={() => setShowPayment(false)} className="px-4 py-2 border rounded-lg">Cancelar</button>
              </div>
            </div>
          )}
        </div>

        {message && (
          <div className="bg-green-100 text-green-700 p-3 rounded-lg text-sm mb-4">{message}</div>
        )}
      </div>

      {/* Right: Product quick pick */}
      <div className="lg:w-80">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h3 className="font-bold mb-2">Productos</h3>
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full border rounded-lg px-3 py-1.5 text-sm mb-2"
          />
          <div className="flex gap-2 mb-2">
            <select
              value={catFilter}
              onChange={e => setCatFilter(Number(e.target.value))}
              className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
            >
              <option value={0}>Todas las categorías</option>
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
              className="border rounded-lg px-3 py-1.5 text-sm hover:bg-gray-50"
              title="Agregar categoría"
            >+</button>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-[70vh] overflow-y-auto">
            {products.map(p => (
              <button
                key={p.id}
                onClick={() => selectProductQuick(p)}
                className="border rounded-lg p-2 text-left hover:bg-blue-50 text-sm"
              >
                <div className="font-medium truncate">{p.name}</div>
                <div className="text-blue-600 font-bold">S/ {p.price.toFixed(2)}</div>
                <div className="text-xs text-gray-400">Stock: {p.stock}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tickets modal */}
      {showTickets && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[70vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h3 className="font-bold">Tickets guardados</h3>
              <button onClick={() => setShowTickets(false)} className="text-gray-400 text-2xl">&times;</button>
            </div>
            <div className="p-4 space-y-3">
              {suspendedTickets.map(t => (
                <div key={t.ticket_id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">Ticket #{t.ticket_id}</span>
                    <span className="text-xs text-gray-400">{t.item_count} items</span>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">
                    {t.items.slice(0, 3).map(i => i.product_name).join(', ')}
                    {t.items.length > 3 && ` +${t.items.length - 3} más`}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleRecall(t.ticket_id)} className="flex-1 bg-blue-600 text-white py-1.5 rounded-lg text-sm">Abrir</button>
                    <button onClick={() => posDiscardTicket(t.ticket_id).then(loadTickets)} className="px-3 border rounded-lg text-sm text-red-600">Descartar</button>
                  </div>
                </div>
              ))}
              {suspendedTickets.length === 0 && <p className="text-gray-400 text-center py-4">Sin tickets guardados</p>}
            </div>
          </div>
        </div>
      )}

      {/* Close modal */}
      {showClose && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 max-w-full">
            {closeInfo?.open ? (
              <>
                <h3 className="font-bold text-lg mb-4">Cerrar Caja</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-500">Efectivo final</label>
                    <input type="number" value={finalCash} onChange={e => setFinalCash(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Gastos del día</label>
                    <input type="number" value={expenses} onChange={e => setExpenses(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                  <button onClick={handleCloseCaja} className="w-full bg-blue-600 text-white py-2 rounded-lg">Cerrar Caja</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-bold text-lg mb-4">Abrir Caja</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-500">Efectivo inicial</label>
                    <input type="number" value={initialCash} onChange={e => setInitialCash(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2" />
                  </div>
                  <button onClick={handleOpenClose} className="w-full bg-green-600 text-white py-2 rounded-lg">Abrir Caja</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
