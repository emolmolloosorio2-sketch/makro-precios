import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import ProductDetail from './pages/ProductDetail'
import Search from './pages/Search'
import POS from './pages/POS'
import Products from './pages/PosProducts'
import Customers from './pages/PosCustomers'
import Debts from './pages/PosDebts'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/pos" className="text-xl font-bold text-blue-600">
            Valis
          </Link>
          <div className="flex gap-3 text-sm text-gray-600">
            <Link to="/pos" className="hover:text-blue-600 font-semibold">POS</Link>
            <Link to="/pos/products" className="hover:text-blue-600">Productos</Link>
            <Link to="/pos/customers" className="hover:text-blue-600">Clientes</Link>
            <Link to="/pos/debts" className="hover:text-blue-600">Deudas</Link>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<POS />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/search" element={<Search />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/pos/products" element={<Products />} />
          <Route path="/pos/customers" element={<Customers />} />
          <Route path="/pos/debts" element={<Debts />} />
        </Routes>
      </main>
    </div>
  )
}
