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
