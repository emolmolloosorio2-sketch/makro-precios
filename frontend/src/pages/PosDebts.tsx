import { useEffect, useState } from 'react'
import { posListDebts, posPayDebt, PosDebt } from '../services/api'

export default function PosDebts() {
  const [debts, setDebts] = useState<PosDebt[]>([])
  const [tab, setTab] = useState('active')
  const [paying, setPaying] = useState<{id:number; name:string; balance:number} | null>(null)
  const [payAmount, setPayAmount] = useState(0)
  const [payMethod, setPayMethod] = useState('cash')

  useEffect(() => {
    posListDebts(tab).then(setDebts)
  }, [tab])

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!paying || payAmount <= 0) return
    const result = await posPayDebt(paying.id, payAmount, payMethod)
    setPaying(null)
    setPayAmount(0)
    setDebts(await posListDebts(tab))
  }

  const totalBalance = debts.reduce((sum, d) => sum + d.balance, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Deudas</h1>
        <span className="text-lg font-bold text-red-600">S/ {totalBalance.toFixed(2)}</span>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('active')} className={`px-4 py-1.5 rounded-lg text-sm ${tab === 'active' ? 'bg-blue-600 text-white' : 'border'}`}>Activas</button>
        <button onClick={() => setTab('paid')} className={`px-4 py-1.5 rounded-lg text-sm ${tab === 'paid' ? 'bg-blue-600 text-white' : 'border'}`}>Pagadas</button>
      </div>

      <div className="space-y-3">
        {debts.map(d => (
          <div key={d.id} className="bg-white rounded-lg border p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-medium">{d.customer_name || `Cliente #${d.customer_id}`}</h3>
                <p className="text-xs text-gray-400">{new Date(d.created_at).toLocaleDateString()}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-red-600">S/ {d.balance.toFixed(2)}</p>
                {d.status === 'paid' && <span className="text-xs text-green-600">Pagado</span>}
                <p className="text-xs text-gray-400">Total: S/ {d.total_amount.toFixed(2)}</p>
              </div>
            </div>
            {d.status === 'active' && (
              <button
                onClick={() => setPaying({id: d.id, name: d.customer_name || `Cliente #${d.customer_id}`, balance: d.balance})}
                className="w-full bg-green-600 text-white py-1.5 rounded-lg text-sm"
              >
                Cobrar S/ {d.balance.toFixed(2)}
              </button>
            )}
          </div>
        ))}
        {debts.length === 0 && (
          <p className="text-center text-gray-400 py-8">{tab === 'active' ? 'No hay deudas activas' : 'No hay pagos registrados'}</p>
        )}
      </div>

      {paying && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form onSubmit={handlePay} className="bg-white rounded-xl p-6 w-80 max-w-full">
            <h3 className="font-bold mb-4">Cobrar a {paying.name}</h3>
            <p className="text-sm text-gray-500 mb-2">Saldo pendiente: S/ {paying.balance.toFixed(2)}</p>
            <input
              type="number"
              value={payAmount}
              onChange={e => setPayAmount(Number(e.target.value))}
              max={paying.balance}
              placeholder="Monto a cobrar"
              className="w-full border rounded-lg px-3 py-2 mb-3"
              autoFocus
              step="0.5"
            />
            <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className="w-full border rounded-lg px-3 py-2 mb-3">
              <option value="cash">Efectivo</option>
              <option value="yape">Yape</option>
              <option value="plin">Plin</option>
            </select>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-green-600 text-white py-2 rounded-lg">Registrar Pago</button>
              <button type="button" onClick={() => setPaying(null)} className="px-4 border rounded-lg">Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
