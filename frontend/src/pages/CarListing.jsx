import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { getCars, getFilterOptions } from '../api/cars'
import CarCard from '../components/CarCard'
import FilterSidebar from '../components/FilterSidebar'
import EmptyState from '../components/ui/EmptyState'

const DEFAULT_FILTERS = { sort: 'year_desc', page: 1, limit: 20 }

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
    if (searchParams.get('min_price')) f.min_price = Number(searchParams.get('min_price'))
    if (searchParams.get('max_price')) f.max_price = Number(searchParams.get('max_price'))
    if (searchParams.get('search')) f.search = searchParams.get('search')
    if (searchParams.get('sort')) f.sort = searchParams.get('sort')
    if (searchParams.get('page')) f.page = Number(searchParams.get('page'))
    return f
  }

  const [filters, setFilters] = useState(filtersFromParams)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

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

  const activeFilterCount = [
    filters.brand, filters.fuel_type, filters.transmission,
    filters.seats, filters.min_price, filters.max_price, filters.search,
  ].filter(Boolean).length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <FilterSidebar filters={filters} options={options} onChange={setFilters} onReset={handleReset} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Mobile filter button */}
          <div className="md:hidden flex items-center gap-3 mb-5">
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium text-gray-700 bg-white hover:border-primary hover:text-primary transition-colors shadow-card"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-primary text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-display font-semibold text-gray-900">
                {loading ? 'Loading…' : `${cars?.total?.toLocaleString() || 0} Cars Found`}
              </h1>
              {filters.search && !loading && (
                <p className="text-sm text-muted mt-0.5">
                  Results for "<span className="text-gray-800 font-medium">{filters.search}</span>"
                  <button
                    onClick={() => setFilters(f => { const { search, ...rest } = f; return { ...rest, page: 1 } })}
                    className="ml-2 text-primary hover:underline text-xs"
                  >
                    clear
                  </button>
                </p>
              )}
            </div>
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
                <EmptyState
                  icon="search"
                  tone="gray"
                  title="No cars match your filters"
                  description="Try widening your price range or clearing a filter or two."
                  action={<button onClick={handleReset} className="text-sm font-semibold text-primary hover:underline">Clear filters</button>}
                />
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

      {/* Mobile filter drawer */}
      {mobileFiltersOpen && createPortal(
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileFiltersOpen(false)} />
          <div className="relative w-80 max-w-[85vw] bg-white h-full overflow-y-auto shadow-xl">
            <FilterSidebar
              filters={filters}
              options={options}
              onChange={setFilters}
              onReset={handleReset}
              mobile={true}
              onClose={() => setMobileFiltersOpen(false)}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
