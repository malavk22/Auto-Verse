import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getBrands } from '../api/cars'

const FEATURES = [
  { icon: '🔍', title: 'Smart Search', desc: 'Filter by brand, fuel, budget, seats and more.' },
  { icon: '⚖️', title: 'Side-by-Side Compare', desc: 'Compare up to 3 cars across every spec.' },
  { icon: '💡', title: 'Recommendations', desc: 'Tell us your needs — we find the best match.' },
  { icon: '💰', title: 'Ownership Calculator', desc: 'See the true 5-year cost before you buy.' },
]

export default function Home() {
  const [search, setSearch] = useState('')
  const [brands, setBrands] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    getBrands().then(setBrands).catch(() => {})
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    const params = search.trim() ? `?brand=${encodeURIComponent(search.trim())}` : ''
    navigate(`/cars${params}`)
  }

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-primary-dark text-white py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-display font-bold mb-4 leading-tight">
            Find Your Perfect Car<br />
            <span className="text-accent">in India's Market</span>
          </h1>
          <p className="text-lg text-teal-100 mb-10">
            Browse 10,000+ cars · Compare specs · Calculate true ownership cost
          </p>
          <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mx-auto">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by brand e.g. Toyota, Honda…"
              className="flex-1 px-4 py-3 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <button
              type="submit"
              className="bg-accent hover:bg-accent-dark text-white font-semibold px-6 py-3 rounded-lg transition-colors text-sm whitespace-nowrap"
            >
              Search Cars
            </button>
          </form>
        </div>
      </section>

      {/* Quick brand filters */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-display font-semibold text-gray-900 mb-6">Browse by Brand</h2>
        <div className="flex flex-wrap gap-3">
          {brands.length === 0
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 w-28 rounded-full bg-gray-200 animate-pulse" />
              ))
            : brands.map(brand => (
                <button
                  key={brand}
                  onClick={() => navigate(`/cars?brand=${encodeURIComponent(brand)}`)}
                  className="px-5 py-2.5 rounded-full border border-border bg-white text-sm font-medium text-gray-700 hover:border-primary hover:text-primary transition-colors shadow-card"
                >
                  {brand}
                </button>
              ))}
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-display font-semibold text-gray-900 text-center mb-10">
            Everything You Need to Buy Smart
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-surface-alt rounded-lg p-6 text-center shadow-card hover:shadow-card-hover transition-shadow">
                <div className="text-4xl mb-3">{f.icon}</div>
                <h3 className="font-display font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-muted">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 text-center">
        <h2 className="text-2xl font-display font-semibold text-gray-900 mb-4">Ready to explore?</h2>
        <p className="text-muted mb-6">Over 10,000 cars from 10 top Indian brands.</p>
        <button
          onClick={() => navigate('/cars')}
          className="bg-primary hover:bg-primary-dark text-white font-semibold px-8 py-3 rounded-lg transition-colors"
        >
          Browse All Cars
        </button>
      </section>
    </div>
  )
}
