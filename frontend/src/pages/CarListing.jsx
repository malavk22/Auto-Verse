import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { getCars, getFilterOptions } from '../api/cars'
import { formatLakhOrCrore } from '../utils/formatCurrency'
import CarCard from '../components/CarCard'
import CarListRow from '../components/CarListRow'
import FilterSidebar, { CustomSelect, SORT_OPTIONS } from '../components/FilterSidebar'
import EmptyState from '../components/ui/EmptyState'
import Icon from '../components/ui/Icon'
import CarCardSkeleton from '../components/ui/CarCardSkeleton'
import { gridContainer, gridItem } from '../utils/motionVariants'

const DEFAULT_FILTERS = { sort: 'year_desc', page: 1, limit: 20 }

// Persists the last-used filters/sort so a bare "/cars" link (e.g. the
// breadcrumb "Cars" crumb on Car Detail, which has no query string of its
// own) restores where you left off instead of silently resetting to
// defaults - explicit filtered links (which do carry query params) still
// take priority over this, see filtersFromParams below.
const FILTERS_KEY = 'autoverse_car_filters'

// Matches CarListRow's shape (thumbnail, title/spec block, price, actions)
// for list view's loading state, same reasoning as CarCardSkeleton above.
function CarListRowSkeleton() {
  return (
    <div className="flex items-center gap-4 bg-white rounded-lg shadow-card p-4 animate-pulse">
      <div className="w-20 h-16 sm:w-32 sm:h-24 shrink-0 rounded-md bg-gray-200" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-2.5 w-16 bg-gray-200 rounded" />
        <div className="h-4 w-32 bg-gray-200 rounded" />
        <div className="h-3 w-40 bg-gray-200 rounded" />
      </div>
      <div className="hidden sm:block h-8 w-20 bg-gray-200 rounded shrink-0" />
      <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
    </div>
  )
}

// Persisted so the choice sticks across visits - read once via lazy init,
// written back on every change.
const VIEW_MODE_KEY = 'autoverse_car_view_mode'

export default function CarListing() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [cars, setCars] = useState(null)
  const [options, setOptions] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [viewMode, setViewMode] = useState(() => {
    try {
      return localStorage.getItem(VIEW_MODE_KEY) === 'list' ? 'list' : 'grid'
    } catch {
      return 'grid'
    }
  })

  const changeViewMode = (mode) => {
    setViewMode(mode)
    try { localStorage.setItem(VIEW_MODE_KEY, mode) } catch {}
  }

  const filtersFromParams = () => {
    // No query string at all (e.g. arrived via a bare "/cars" link) - fall
    // back to whatever was last browsed instead of defaults, if we have it.
    if ([...searchParams].length === 0) {
      try {
        const saved = sessionStorage.getItem(FILTERS_KEY)
        if (saved) return { ...DEFAULT_FILTERS, ...JSON.parse(saved), page: 1 }
      } catch {}
      return { ...DEFAULT_FILTERS }
    }

    const f = { ...DEFAULT_FILTERS }
    if (searchParams.get('brand')) f.brand = searchParams.get('brand')
    if (searchParams.get('fuel_type')) f.fuel_type = searchParams.get('fuel_type')
    if (searchParams.get('transmission')) f.transmission = searchParams.get('transmission')
    if (searchParams.get('seats')) f.seats = Number(searchParams.get('seats'))
    if (searchParams.get('min_price')) f.min_price = Number(searchParams.get('min_price'))
    if (searchParams.get('max_price')) f.max_price = Number(searchParams.get('max_price'))
    if (searchParams.get('search')) f.search = searchParams.get('search')
    if (searchParams.get('body_type')) f.body_type = searchParams.get('body_type')
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

  // Dragging a price slider fires many rapid filter changes - without this
  // guard, an earlier request can resolve after a later one and stomp the
  // correct result with a stale one.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    // Sync filters back to URL, and remember them for the next bare "/cars"
    // visit (see FILTERS_KEY above).
    const params = {}
    Object.entries(filters).forEach(([k, v]) => { if (v !== undefined && v !== null) params[k] = v })
    setSearchParams(params, { replace: true })
    try { sessionStorage.setItem(FILTERS_KEY, JSON.stringify(filters)) } catch {}

    getCars(filters)
      .then(data => { if (!cancelled) { setCars(data); setLoading(false) } })
      .catch(() => { if (!cancelled) { setError('Failed to load cars. Is the API running?'); setLoading(false) } })

    return () => { cancelled = true }
  }, [filters])

  const handleReset = () => setFilters({ ...DEFAULT_FILTERS })

  const totalPages = cars ? Math.ceil(cars.total / filters.limit) : 0

  const activeFilterCount = [
    filters.brand, filters.fuel_type, filters.transmission,
    filters.seats, filters.min_price, filters.max_price, filters.search, filters.body_type,
  ].filter(Boolean).length

  // Clears just the given keys, resets to page 1, leaves every other
  // active filter untouched.
  const clearKeys = (...keys) => setFilters(f => {
    const next = { ...f, page: 1 }
    keys.forEach(k => delete next[k])
    return next
  })

  const chips = []
  if (filters.search) chips.push({ key: 'search', label: `"${filters.search}"`, clear: () => clearKeys('search') })
  if (filters.body_type) chips.push({ key: 'body_type', label: `${filters.body_type}s`, clear: () => clearKeys('body_type') })
  if (filters.brand) chips.push({ key: 'brand', label: filters.brand, clear: () => clearKeys('brand') })
  if (filters.fuel_type) chips.push({ key: 'fuel_type', label: filters.fuel_type, clear: () => clearKeys('fuel_type') })
  if (filters.transmission) chips.push({ key: 'transmission', label: filters.transmission, clear: () => clearKeys('transmission') })
  if (filters.seats) chips.push({ key: 'seats', label: `${filters.seats}+ seats`, clear: () => clearKeys('seats') })
  if (filters.min_price != null || filters.max_price != null) {
    const lo = filters.min_price ? formatLakhOrCrore(filters.min_price) : formatLakhOrCrore(options.min_price || 0)
    const hi = filters.max_price ? formatLakhOrCrore(filters.max_price) : formatLakhOrCrore(options.max_price || 0)
    chips.push({ key: 'price', label: `${lo} – ${hi}`, clear: () => clearKeys('min_price', 'max_price') })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28">
      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="hidden md:block"
        >
          <FilterSidebar filters={filters} options={options} onChange={setFilters} onReset={handleReset} />
        </motion.div>

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
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <h1 className="text-2xl font-display font-semibold text-gray-900 flex items-center gap-2">
              <Icon name="search" className="w-5 h-5 text-primary shrink-0" />
              {loading ? 'Loading…' : `${cars?.total?.toLocaleString() || 0} Cars Found`}
            </h1>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex-1 sm:w-48">
                <CustomSelect
                  value={filters.sort || 'year_desc'}
                  onChange={v => setFilters(f => ({ ...f, sort: v, page: 1 }))}
                  options={SORT_OPTIONS}
                  placeholder="Sort by"
                />
              </div>
              {/* Grid/list toggle - hidden below sm, where a horizontal
                  row layout doesn't have room to breathe anyway (see
                  CarListRow's own responsive trimming). Persisted so the
                  choice sticks across visits. */}
              <div className="hidden sm:flex items-center border border-border rounded-lg overflow-hidden shrink-0">
                <button
                  onClick={() => changeViewMode('grid')}
                  aria-label="Grid view"
                  aria-pressed={viewMode === 'grid'}
                  className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-white text-gray-500 hover:text-primary'}`}
                >
                  <Icon name="grid" className="w-4 h-4" />
                </button>
                <button
                  onClick={() => changeViewMode('list')}
                  aria-label="List view"
                  aria-pressed={viewMode === 'list'}
                  className={`p-2.5 border-l border-border transition-colors ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-white text-gray-500 hover:text-primary'}`}
                >
                  <Icon name="list" className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Active filter chips */}
          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <AnimatePresence initial={false}>
                {chips.map(c => (
                  <motion.span
                    key={c.key}
                    layout
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="inline-flex items-center gap-1 bg-primary/8 text-primary text-xs font-medium pl-3 pr-1.5 py-1.5 rounded-full"
                  >
                    {c.label}
                    <button
                      onClick={c.clear}
                      aria-label={`Remove ${c.key} filter`}
                      className="hover:bg-primary/15 rounded-full p-0.5 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
              <button onClick={handleReset} className="text-xs text-muted hover:text-primary underline ml-1">
                Clear all
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-error border border-red-200 rounded-lg px-4 py-3 text-sm">{error}</div>
          )}

          {/* Grid */}
          {!error && (
            <>
              {loading ? (
                viewMode === 'list' ? (
                  <div className="space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <CarListRowSkeleton key={i} />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <CarCardSkeleton key={i} />
                    ))}
                  </div>
                )
              ) : cars?.items?.length === 0 ? (
                <EmptyState
                  icon="search"
                  tone="gray"
                  title="No cars match your filters"
                  description="Try widening your price range or clearing a filter or two."
                  action={<button onClick={handleReset} className="text-sm font-semibold text-primary hover:underline">Clear filters</button>}
                />
              ) : viewMode === 'list' ? (
                <motion.div
                  key={filters.page}
                  variants={gridContainer}
                  initial="hidden"
                  animate="show"
                  className="space-y-3"
                >
                  {cars.items.map(car => (
                    <motion.div key={car.id} variants={gridItem}>
                      <CarListRow car={car} />
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key={filters.page}
                  variants={gridContainer}
                  initial="hidden"
                  animate="show"
                  className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
                >
                  {cars.items.map(car => (
                    <motion.div key={car.id} variants={gridItem}>
                      <CarCard car={car} />
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* Pagination */}
              {!loading && totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <motion.button
                    whileHover={filters.page > 1 ? { y: -1 } : {}}
                    whileTap={filters.page > 1 ? { scale: 0.95 } : {}}
                    disabled={filters.page <= 1}
                    onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                    className="px-4 py-2 rounded border border-border text-sm font-medium disabled:opacity-40 hover:border-primary hover:text-primary transition-colors"
                  >
                    ← Prev
                  </motion.button>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={filters.page}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="text-sm text-muted w-28 text-center"
                    >
                      Page {filters.page} of {totalPages}
                    </motion.span>
                  </AnimatePresence>
                  <motion.button
                    whileHover={filters.page < totalPages ? { y: -1 } : {}}
                    whileTap={filters.page < totalPages ? { scale: 0.95 } : {}}
                    disabled={filters.page >= totalPages}
                    onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                    className="px-4 py-2 rounded border border-border text-sm font-medium disabled:opacity-40 hover:border-primary hover:text-primary transition-colors"
                  >
                    Next →
                  </motion.button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {createPortal(
        <AnimatePresence>
          {mobileFiltersOpen && (
            <div className="fixed inset-0 z-50 md:hidden flex">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-black/50"
                onClick={() => setMobileFiltersOpen(false)}
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', stiffness: 320, damping: 34 }}
                className="relative w-80 max-w-[85vw] bg-white h-full overflow-y-auto shadow-xl"
              >
                <FilterSidebar
                  filters={filters}
                  options={options}
                  onChange={setFilters}
                  onReset={handleReset}
                  mobile={true}
                  onClose={() => setMobileFiltersOpen(false)}
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
