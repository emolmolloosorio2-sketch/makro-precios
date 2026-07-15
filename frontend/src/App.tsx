import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'
import ProductDetail from './pages/ProductDetail'
import Search from './pages/Search'

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-blue-600">
            PreciosClone
          </Link>
          <div className="flex gap-4 text-sm text-gray-600">
            <Link to="/" className="hover:text-blue-600">Inicio</Link>
            <Link to="/search" className="hover:text-blue-600">Buscar</Link>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/search" element={<Search />} />
        </Routes>
      </main>
    </div>
  )
}
