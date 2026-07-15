import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { getProduct, getPriceHistory, createAlert, Product, PricePoint } from '../services/api'

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const [product, setProduct] = useState<Product | null>(null)
  const [history, setHistory] = useState<PricePoint[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [targetPrice, setTargetPrice] = useState('')
  const [alertMsg, setAlertMsg] = useState('')

  useEffect(() => {
    if (id) load()
  }, [id])

  async function load() {
    if (!id) return
    setLoading(true)
    try {
      const [p, h] = await Promise.all([
        getProduct(Number(id)),
        getPriceHistory(Number(id)),
      ])
      setProduct(p)
      setHistory(h)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  async function handleAlert() {
    if (!id || !email || !targetPrice) return
    try {
      await createAlert({
        product_id: Number(id),
        email,
        target_price: Number(targetPrice),
      })
      setAlertMsg('Alerta creada. Te notificaremos cuando baje de precio.')
      setEmail('')
      setTargetPrice('')
    } catch {
      setAlertMsg('Error al crear alerta.')
    }
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Cargando...</div>
  if (!product) return <div className="text-center py-12 text-gray-500">Producto no encontrado</div>

  const latest = history[history.length - 1]

  const chartData = history.map((h) => ({
    fecha: new Date(h.recorded_at).toLocaleDateString(),
    precio: h.price,
    original: h.original_price || undefined,
  }))

  const minPrice = history.length > 0 ? Math.min(...history.map((h) => h.price)) : 0

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-6">
          {product.image_url && (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full md:w-64 h-64 object-contain rounded-lg border"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
          <div className="flex-1">
            <h1 className="text-xl font-bold mb-2">{product.name}</h1>
            {product.brand && (
              <p className="text-sm text-gray-500 mb-2">Marca: {product.brand}</p>
            )}
            <p className="text-sm text-gray-500 mb-4">Tienda: {product.store}</p>

            {latest && (
              <div className="flex items-center gap-4 mb-4">
                <span className="text-3xl font-bold text-blue-600">
                  S/ {latest.price.toFixed(2)}
                </span>
                {latest.original_price && latest.original_price > latest.price && (
                  <>
                    <span className="text-lg text-gray-400 line-through">
                      S/ {latest.original_price.toFixed(2)}
                    </span>
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm font-medium">
                      -{Math.round(latest.discount_percentage || 0)}%
                    </span>
                  </>
                )}
              </div>
            )}

            {product.in_store_only === 1 && (
              <div className="mb-3">
                <span className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded font-medium">
                  Solo disponible en tienda física
                </span>
                {product.description && (
                  <p className="text-xs text-gray-500 mt-1">{product.description}</p>
                )}
              </div>
            )}

            {product.promotion_data?.type === 'quantity_discount' && (
              <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm font-medium text-blue-800">
                  {product.promotion_data.min_quantity > 0 ? (
                    <>Llevando {product.promotion_data.min_quantity}: S/ {product.promotion_data.discounted_price_per_unit?.toFixed(2)} c/u</>
                  ) : (
                    <>Ahorras S/ {product.promotion_data.total_discount?.toFixed(2)} al llevar más de 1</>
                  )}
                </p>
              </div>
            )}

            {history.length > 0 && (
              <p className="text-sm text-gray-500">
                Precio más bajo histórico: <span className="font-semibold">S/ {minPrice.toFixed(2)}</span>
              </p>
            )}

            {product.product_url && product.in_store_only !== 1 && (
              <a
                href={product.product_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Ir a la tienda
              </a>
            )}
          </div>
        </div>
      </div>

      {history.length > 1 && (
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Historial de Precios</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fecha" fontSize={12} />
              <YAxis domain={['auto', 'auto']} fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="precio" stroke="#2563eb" strokeWidth={2} dot={false} name="Precio actual" />
              <Line type="monotone" dataKey="original" stroke="#9ca3af" strokeWidth={1} dot={false} name="Precio original" strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold mb-4">Crear Alerta de Precio</h2>
        <p className="text-sm text-gray-500 mb-4">
          Recibe un correo cuando este producto baje de tu precio objetivo.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            placeholder="Tu correo"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border rounded-lg px-3 py-2 flex-1"
          />
          <input
            type="number"
            placeholder="Precio objetivo S/"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            className="border rounded-lg px-3 py-2 w-40"
          />
          <button
            onClick={handleAlert}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
          >
            Crear Alerta
          </button>
        </div>
        {alertMsg && (
          <p className="mt-3 text-sm text-green-600">{alertMsg}</p>
        )}
      </div>
    </div>
  )
}
