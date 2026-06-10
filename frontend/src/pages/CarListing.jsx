import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getCars, getFilterOptions } from '../api/cars'
import CarCard from '../components/CarCard'
import FilterSidebar from '../components/FilterSidebar'

const DEFAULT_FILTERS = { sort: 'price_asc', page: 1, limit: 20 }

export default function CarListing() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [cars, setCars] = useState(null)
  const [options, setOptions] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const filtersFromParams = () => {
    const f = { ...DEFAULT_FILTERS }
    if (searchParams.get('brand')) f.brand = searchParams.get('brand')
    if (searchParams.get('fuel_type')) f.fuel_type = searchParams.get('fuel_type')
    if (searchParams.get('transmission')) f.transmission = searchParams.get('transmission')
    if (searchParams.get('seats')) f.seats = Number(searchParams.get('seats'))
    if (searchParams.get('max_price')) f.max_price = Number(searchParams.get('max_price'))
    if (searchParams.get('sort')) f.sort = searchParams.get('sort')
    if (searchParams.get('page')) f.page = Number(searchParams.get('page'))
    return f
  }

  const [filters, setFilters] = useState(filtersFromParams)

  // Load filter options once
  useEffect(() => {
    getFilterOptions().then(setOptions).catch(() => {})
  }, [])

  // Fetch cars whenever filters change
  useEffect(() => {
    setLoading(true)
    setError(null)
    // Sync filters back to URL
    const params = {}
    Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== null) params[k] = v })
    setSearchParams(params, { replace: true })

    getCars(filters)
      .then(data => { setCars(data); setLoading(false) })
      .catch(() => { setError('Failed to load cars. Is the API running?'); setLoading(false) })
  }, [filters])

  const handleReset = () => setFilters({ ...DEFAULT_FILTERS })

  const totalPages = cars ? Math.ceil(cars.total / filters.limit) : 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex gap-8">
        <FilterSidebar filters={filters} options={options} onChange={setFilters} onReset={handleReset} />

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-display font-semibold text-gray-900">
              {loading ? 'Loading…' : `${cars?.total?.toLocaleString() || 0} Cars Found`}
            </h1>
          </div>

          {error && (
            <div className="bg-red-50 text-error border border-red-200 rounded-lg px-4 py-3 text-sm">{error}</div>
          )}

          {/* Grid */}
          {!error && (
            <>
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-lg shadow-card h-64 animate-pulse" />
                  ))}
                </div>
              ) : cars?.items?.length === 0 ? (
                <div className="text-center py-20 text-muted">
                  <p className="text-4xl mb-3">🚗</p>
                  <p className="font-medium text-gray-700">No cars match your filters.</p>
                  <button onClick={handleReset} className="mt-3 text-sm text-primary hover:underline">Clear filters</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {cars.items.map(car => <CarCard key={car.id} car={car} />)}
                </div>
              )}

              {/* Pagination */}
              {!loading && totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <button
                    disabled={filters.page <= 1}
                    onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                    className="px-4 py-2 rounded border border-border text-sm font-medium disabled:opacity-40 hover:border-primary hover:text-primary transition-colors"
                  >
                    ← Prev
                  </button>
                  <span className="text-sm text-muted">
                    Page {filters.page} of {totalPages}
                  </span>
                  <button
                    disabled={filters.page >= totalPages}
                    onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                    className="px-4 py-2 rounded border border-border text-sm font-medium disabled:opacity-40 hover:border-primary hover:text-primary transition-colors"
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
