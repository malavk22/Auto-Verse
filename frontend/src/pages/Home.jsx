import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { getBrands, getAutocomplete } from '../api/cars'
import Icon from '../components/ui/Icon'

const FEATURES = [
  { icon: 'search',  title: 'Smart Search',         desc: 'Filter by brand, fuel, budget, seats and more.',   to: '/cars' },
  { icon: 'compare', title: 'Side-by-Side Compare', desc: 'Compare up to 3 cars across every spec.',          to: '/compare' },
  { icon: 'target',  title: 'Recommendations',       desc: 'Tell us your needs — we find the best match.',     to: '/recommendations' },
  { icon: 'wallet',  title: 'Ownership Calculator',  desc: 'See the true 5-year cost before you buy.',         to: '/calculator' },
]

export default function Home() {
  const [search, setSearch]           = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showDrop, setShowDrop]       = useState(false)
  const [activeIdx, setActiveIdx]     = useState(-1)
  const [brands, setBrands]           = useState([])
  const navigate   = useNavigate()
  const wrapperRef = useRef(null)

  useEffect(() => {
    getBrands().then(setBrands).catch(() => {})
  }, [])

  // Debounced autocomplete fetch
  useEffect(() => {
    if (search.trim().length < 2) { setSuggestions([]); setShowDrop(false); return }
    const t = setTimeout(() => {
      getAutocomplete(search.trim())
        .then(data => { setSuggestions(data); setShowDrop(data.length > 0); setActiveIdx(-1) })
        .catch(() => {})
    }, 280)
    return () => clearTimeout(t)
  }, [search])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (!wrapperRef.current?.contains(e.target)) setShowDrop(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const goTo = (item) => {
    setShowDrop(false)
    setSearch('')
    if (item.type === 'model') navigate(`/cars?search=${encodeURIComponent(item.label)}`)
    else navigate(`/cars?brand=${encodeURIComponent(item.label)}`)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (activeIdx >= 0 && suggestions[activeIdx]) { goTo(suggestions[activeIdx]); return }
    if (!search.trim()) return
    setShowDrop(false)
    navigate(`/cars?search=${encodeURIComponent(search.trim())}`)
  }

  const handleKeyDown = (e) => {
    if (!showDrop) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)) }
    else if (e.key === 'Escape') setShowDrop(false)
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
            Browse 50+ models · Compare specs · Calculate true ownership cost
          </p>

          {/* Search with autocomplete */}
          <div ref={wrapperRef} className="relative max-w-xl mx-auto">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => suggestions.length > 0 && setShowDrop(true)}
                placeholder="Search by car name or brand…"
                className="flex-1 px-4 py-3 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <button
                type="submit"
                className="bg-accent hover:bg-accent-dark text-white font-semibold px-6 py-3 rounded-lg transition-colors text-sm whitespace-nowrap"
              >
                Search
              </button>
            </form>

            {/* Suggestions dropdown */}
            {showDrop && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 text-left">
                {/* Models */}
                {suggestions.filter(s => s.type === 'model').length > 0 && (
                  <>
                    <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Models</p>
                    {suggestions.filter(s => s.type === 'model').map((s, i) => (
                      <button
                        key={i}
                        onMouseDown={() => goTo(s)}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                          suggestions.indexOf(s) === activeIdx ? 'bg-primary/8 text-primary' : 'text-gray-800 hover:bg-gray-50'
                        }`}
                      >
                        <span className="font-medium">{s.label}</span>
                        <span className="text-xs text-gray-400">{s.brand}</span>
                      </button>
                    ))}
                  </>
                )}
                {/* Brands */}
                {suggestions.filter(s => s.type === 'brand').length > 0 && (
                  <>
                    <p className="px-4 pt-2 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-t border-gray-100">Brands</p>
                    {suggestions.filter(s => s.type === 'brand').map((s, i) => (
                      <button
                        key={i}
                        onMouseDown={() => goTo(s)}
                        className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                          suggestions.indexOf(s) === activeIdx ? 'bg-primary/8 text-primary' : 'text-gray-800 hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Brand</span>
                        <span className="font-medium">{s.label}</span>
                      </button>
                    ))}
                  </>
                )}
                {/* Press enter hint */}
                <p className="px-4 py-2 text-[10px] text-gray-400 border-t border-gray-100">
                  Press Enter to search all results for "<span className="font-medium text-gray-500">{search}</span>"
                </p>
              </div>
            )}
          </div>
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
              <Link key={f.title} to={f.to} className="bg-surface-alt rounded-lg p-6 text-center shadow-card hover:shadow-card-hover hover:border-primary/20 border border-transparent transition-all group">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3 group-hover:bg-primary group-hover:text-white transition-colors">
                  <Icon name={f.icon} className="w-6 h-6" />
                </div>
                <h3 className="font-display font-semibold text-gray-900 mb-1 group-hover:text-primary transition-colors">{f.title}</h3>
                <p className="text-sm text-muted">{f.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 text-center">
        <h2 className="text-2xl font-display font-semibold text-gray-900 mb-4">Ready to explore?</h2>
        <p className="text-muted mb-6">
          Over 10,000 cars{brands.length > 0 ? ` from ${brands.length} Indian brands` : ''}.
        </p>
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
