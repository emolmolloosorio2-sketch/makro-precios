const API_BASE = '/api'

export interface PricePoint {
  id: number
  price: number
  original_price: number | null
  discount_percentage: number | null
  recorded_at: string
}

export interface QuantityDiscount {
  type: 'quantity_discount'
  min_quantity: number
  total_discount: number
  discount_per_unit: number
  discounted_price_per_unit: number
}

export interface Product {
  id: number
  name: string
  brand: string | null
  category: string | null
  image_url: string | null
  product_url: string | null
  sku: string | null
  store: string
  in_store_only: number
  description: string | null
  promotion_data: QuantityDiscount | null
  created_at: string
  price_history: PricePoint[]
}

export interface SearchResult {
  id: number
  name: string
  brand: string | null
  image_url: string | null
  product_url: string | null
  store: string
  in_store_only: number
  description: string | null
  promotion_data: QuantityDiscount | null
  current_price: number | null
  original_price: number | null
  discount_percentage: number | null
  similarity: number
}

export interface AlertData {
  product_id: number
  email: string
  target_price: number
}

export async function searchProducts(
  q: string,
  store?: string,
  threshold = 0.3
): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q, threshold: String(threshold) })
  if (store) params.set('store', store)
  const res = await fetch(`${API_BASE}/products/search/?${params}`)
  if (!res.ok) throw new Error('Search failed')
  return res.json()
}

export async function getRecentUpdates(store?: string, onlyChanged = false, limit = 100, sortBy = 'absolute'): Promise<Product[]> {
  const params = new URLSearchParams({ limit: String(limit), sort_by: sortBy })
  if (store) params.set('store', store)
  if (onlyChanged) params.set('only_changed', 'true')
  const res = await fetch(`${API_BASE}/products/updates?${params}`)
  return res.json()
}

export async function getProductsCount(store?: string, category?: string, q?: string): Promise<number> {
  const params = new URLSearchParams()
  if (store) params.set('store', store)
  if (category) params.set('category', category)
  if (q) params.set('q', q)
  const res = await fetch(`${API_BASE}/products/count?${params}`)
  const data = await res.json()
  return data.count
}

export async function getProduct(id: number): Promise<Product> {
  const res = await fetch(`${API_BASE}/products/${id}`)
  if (!res.ok) throw new Error('Product not found')
  return res.json()
}

export async function getProducts(store?: string, skip = 0, limit = 30, category?: string, q?: string): Promise<Product[]> {
  const params = new URLSearchParams({ skip: String(skip), limit: String(limit) })
  if (store) params.set('store', store)
  if (category) params.set('category', category)
  if (q) params.set('q', q)
  const res = await fetch(`${API_BASE}/products/?${params}`)
  return res.json()
}

export async function getPriceHistory(productId: number): Promise<PricePoint[]> {
  const res = await fetch(`${API_BASE}/products/${productId}/history`)
  return res.json()
}

export async function createAlert(data: AlertData): Promise<void> {
  const res = await fetch(`${API_BASE}/alerts/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Failed to create alert')
}

export async function triggerScrape(store: string): Promise<{ products_saved: number }> {
  const res = await fetch(`${API_BASE}/scrape/${store}`, { method: 'POST' })
  return res.json()
}

// ── POS Types ──────────────────────────────────────────────────────────

export interface PosProduct {
  id: number
  name: string
  barcode: string | null
  price: number
  cost_price: number | null
  stock: number
  min_stock: number | null
  unit: string
  category_id: number | null
  category_name: string | null
  is_active: number
  created_at: string
}

export interface PosCategory {
  id: number
  name: string
}

export interface PosCustomer {
  id: number
  name: string
  phone: string | null
  address: string | null
  notes: string | null
  debt_balance: number
  created_at: string
}

export interface PosSaleItem {
  product_id?: number
  product_name: string
  quantity: number
  unit_price: number
}

export interface PosSale {
  id: number
  customer_id: number | null
  total: number
  discount: number
  payment_method: string
  status: string
  notes: string | null
  items: {
    id: number
    product_id: number | null
    product_name: string
    quantity: number
    unit_price: number
    subtotal: number
  }[]
  created_at: string
}

export interface PosDebt {
  id: number
  customer_id: number
  customer_name: string | null
  sale_id: number | null
  total_amount: number
  paid_amount: number
  balance: number
  status: string
  notes: string | null
  created_at: string
}

// ── POS API ────────────────────────────────────────────────────────────

export async function posListCategories(): Promise<PosCategory[]> {
  const r = await fetch(`${API_BASE}/pos/categories`)
  return r.json()
}

export async function posCreateCategory(name: string): Promise<PosCategory> {
  const r = await fetch(`${API_BASE}/pos/categories`, {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({name}),
  })
  return r.json()
}

export async function posListProducts(search?: string, category_id?: number): Promise<PosProduct[]> {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (category_id) params.set('category_id', String(category_id))
  const r = await fetch(`${API_BASE}/pos/products?${params}`)
  return r.json()
}

export async function posGetProductByBarcode(barcode: string): Promise<PosProduct> {
  const r = await fetch(`${API_BASE}/pos/products/barcode/${encodeURIComponent(barcode)}`)
  if (!r.ok) throw new Error('Not found')
  return r.json()
}

export async function posCreateProduct(data: Partial<PosProduct>): Promise<PosProduct> {
  const r = await fetch(`${API_BASE}/pos/products`, {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data),
  })
  return r.json()
}

export async function posUpdateProduct(id: number, data: Partial<PosProduct>): Promise<PosProduct> {
  const r = await fetch(`${API_BASE}/pos/products/${id}`, {
    method: 'PUT', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data),
  })
  return r.json()
}

export async function posDeleteProduct(id: number): Promise<void> {
  await fetch(`${API_BASE}/pos/products/${id}`, {method: 'DELETE'})
}

export async function posUpdateStock(product_id: number, quantity: number): Promise<{stock: number}> {
  const r = await fetch(`${API_BASE}/pos/products/${product_id}/stock?quantity=${quantity}`, {method: 'POST'})
  return r.json()
}

export async function posListCustomers(search?: string): Promise<PosCustomer[]> {
  const params = search ? `?search=${encodeURIComponent(search)}` : ''
  const r = await fetch(`${API_BASE}/pos/customers${params}`)
  return r.json()
}

export async function posGetCustomer(id: number): Promise<PosCustomer> {
  const r = await fetch(`${API_BASE}/pos/customers/${id}`)
  return r.json()
}

export interface CustomerSale {
  sale_id: number
  date: string
  total: number
  cash_paid: number
  debt_total: number
  debt_balance: number
  debt_status: string | null
  payment_method: string
  items: {product_name: string; quantity: number; unit_price: number; subtotal: number}[]
}

export async function posCustomerHistory(id: number): Promise<CustomerSale[]> {
  const r = await fetch(`${API_BASE}/pos/customers/${id}/history`)
  return r.json()
}

export async function posCreateCustomer(data: {name: string; phone?: string}): Promise<PosCustomer> {
  const r = await fetch(`${API_BASE}/pos/customers`, {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data),
  })
  return r.json()
}

export async function posCreateSale(data: {
  customer_id?: number
  items: PosSaleItem[]
  discount?: number
  payment_method: string
  as_debt?: boolean
  cash_paid?: number
}): Promise<PosSale> {
  const r = await fetch(`${API_BASE}/pos/sales`, {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(data),
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

export async function posGetTodaySales(): Promise<{count: number; total: number; by_method: Record<string, number>; sales: PosSale[]}> {
  const r = await fetch(`${API_BASE}/pos/sales/today`)
  return r.json()
}

export async function posListDebts(status?: string): Promise<PosDebt[]> {
  const params = status ? `?status=${status}` : ''
  const r = await fetch(`${API_BASE}/pos/debts${params}`)
  return r.json()
}

export async function posPayDebt(debt_id: number, amount: number, payment_method = 'cash'): Promise<{paid: number; balance: number; status: string}> {
  const r = await fetch(`${API_BASE}/pos/debts/${debt_id}/pay`, {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({amount, payment_method}),
  })
  return r.json()
}

export async function posCloseStatus(): Promise<{open: boolean; close_id?: number; opened_at?: string; initial_cash?: number}> {
  const r = await fetch(`${API_BASE}/pos/close/status`)
  return r.json()
}

export async function posOpenClose(initial_cash = 0): Promise<void> {
  await fetch(`${API_BASE}/pos/close/open?initial_cash=${initial_cash}`, {method: 'POST'})
}

export async function posCloseCaja(close_id: number, final_cash: number, total_expenses = 0, notes?: string): Promise<void> {
  await fetch(`${API_BASE}/pos/close/${close_id}`, {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({final_cash, total_expenses, notes}),
  })
}

// ── Tickets ─────────────────────────────────────────────────────────────

export interface SuspendedTicket {
  ticket_id: number
  created_at: string
  items: {product_name: string; quantity: number; unit_price: number}[]
  item_count: number
}

export interface TicketDetail {
  ticket_id: number
  created_at: string
  items: {product_id?: number; product_name: string; quantity: number; unit_price: number}[]
}

export async function posSuspendTicket(items: {product_id?: number; product_name: string; quantity: number; unit_price: number}[]): Promise<{ticket_id: number}> {
  const r = await fetch(`${API_BASE}/pos/tickets/suspend`, {
    method: 'POST', headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(items),
  })
  return r.json()
}

export async function posListSuspendedTickets(): Promise<SuspendedTicket[]> {
  const r = await fetch(`${API_BASE}/pos/tickets/suspended`)
  return r.json()
}

export async function posGetSuspendedTicket(ticket_id: number): Promise<TicketDetail> {
  const r = await fetch(`${API_BASE}/pos/tickets/${ticket_id}`)
  return r.json()
}

export async function posDiscardTicket(ticket_id: number): Promise<void> {
  await fetch(`${API_BASE}/pos/tickets/${ticket_id}`, {method: 'DELETE'})
}
